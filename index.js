const DirectusSDK = require("@directus/sdk-js");
const http = require('https');
const fs = require('fs');
const path = require('path');

const imageTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
]

// TODO ADD CLEANUP OF UNUSED IMAGES / FILES
let download = async (url, dest, dir = './.cache-directus/img-cache') => {
  
  var imgName = dest;

  if (!fs.existsSync('./.cache-directus')){
    fs.mkdirSync('./.cache-directus');
  }

  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
  }

  dest = dir + '/' + dest;

  var cleanImageName = path.resolve(dest);

  if (fs.existsSync(dest)) return cleanImageName;

  console.log(' -- Downloading Resource: ' + imgName);

  return new Promise((resolve, reject) => {
    var file = fs.createWriteStream(dest);
    http.get(url, function(response) {
      response.pipe(file);
      file.on('finish', function() {
        resolve(cleanImageName);
      });
    }).on('error', function(err) {
      fs.unlink(dest);
      reject(err.message);
    });
  });  
};

function sanitizeFields(fields) {
  Object.keys(fields).forEach((key) => { 
    if(fields[key] === null || fields[key] === undefined) {
      delete fields[key];
    }
  });
  return fields;
}

function sanitizeItem(fields) {
  let { id, title, slug, path, date, content, excerpt } = fields;

  let _id = id.toString();

  delete fields.id;
  fields._directusID = _id;

  return sanitizeFields(fields);
}

async function checkForImages(item) {

  for(const itemKey in item) {
    const itemContent = item[itemKey];
    if(itemContent && itemContent.type && imageTypes.includes(itemContent.type)) {
      item[itemKey].gridsome_image = await download(itemContent.data.full_url, itemContent.filename_disk);
    } else if(itemContent && itemKey !== 'owner' && typeof itemContent === 'object' && Object.keys(itemContent).length > 0) {
      item[itemKey] = await checkForImages(itemContent);
    }
  }

  return item;
}

async function checkForDownloads(item) {

  for(const itemKey in item) {
    const itemContent = item[itemKey];
    if(itemContent && itemContent.type && itemContent.data) {
      item[itemKey].gridsome_link = await download(itemContent.data.full_url, itemContent.filename_disk, './.cache-directus/file-cache');
    } else if(itemContent && itemKey !== 'owner' && typeof itemContent === 'object' && Object.keys(itemContent).length > 0) {
      item[itemKey] = await checkForDownloads(itemContent);
    }
  }

  return item;
}

class DirectusSource {
  static defaultOptions () {
    return {
      typeName: 'Directus',
      apiUrl: undefined,
      project: '_',
      staticToken: undefined,
      email: undefined,
      password: undefined,
      maxRetries: 3,
      reconnectTimeout: 10000,
      collections: []
    }
  }

  constructor (api, options) {
    this.api = api;
    this.options = options;
    api.loadSource(args => this.fetchContent(args));
  }

  async fetchContent (store) {
    const { addCollection, getContentType, slugify } = store
    const { apiUrl, project, staticToken, email, password, collections, maxRetries, reconnectTimeout } = this.options

    const directusOptions = {
      url: apiUrl,
      project: project,
      token: staticToken
    };
    
    const client = new DirectusSDK(directusOptions);

    let retries = 0;

    let connect = async () => {
      return new Promise(async (resolve, reject) => {
          try {
            await client.login(Object.assign({ email, password, persist: false }, directusOptions));
            
            resolve(await client.getCollections());
          } catch (e) {
            console.error("DIRECTUS ERROR: Can not login to Directus", e);
  
            if(retries < maxRetries) {
              retries++;
              console.log("DIRECTUS - Retrying to connect in 10 seconds...");
  
              setTimeout(async () => {
                await connect();
              }, reconnectTimeout);
            } else {
              reject(process.exit(1))
              throw new Error("DIRECTUS ERROR: Can not login to Directus");
            }          
          }
      });      
    }    
    
    if(email && password) {
      let data = await connect();  
    }
    
    console.log("DIRECTUS: Loading data from Directus at: " + apiUrl);

    if(collections.length <= 0) {
      console.error("DIRECTUS ERROR: No Directus collections specified!");
      process.exit(1)
      throw new Error("DIRECTUS ERROR: No Directus collections specified!");
    }

    for(const collection of collections) {
      let collectionName;
      let params;
      let directusPathName;
      if(typeof collection === 'object') {
        collectionName = collection.name;
        directusPathName = collection.directusPathName || collectionName
        delete collection.name;
        params = collection;
      } else {
        collectionName = collection;
      }
      
      try {
        let data = await client.getItems(directusPathName, params);
        data = data.data;

        let route;

        if(params) {
          if(params.hasRoute) {
            route = `/${slugify(collectionName)}/:slug`;
          } else if(params.route) {
            if(typeof params.route === 'function') {
              route = params.route(collectionName, collection, slugify);
            } else {
              route = params.route;
            }
          }
        }
        
        const contentType = addCollection({
          typeName: collectionName, // TODO change name creation
          route: route
        })
        
        for(let item of data) {

          if(params.downloadImages) {
            item = await checkForImages(item);
          }

          if(params.downloadFiles) {
            item = await checkForDownloads(item);
          }

          contentType.addNode(sanitizeItem(item))
        }

      } catch (e) {
        console.error("DIRECTUS ERROR: Can not load data for collection '", e);
        process.exit(1)
        throw "DIRECTUS ERROR: Can not load data for collection '" + collectionName + "'!";
      }
    }

    console.log("DIRECTUS: Loading done!");
    client.logout();

  }
}

module.exports = DirectusSource
