const DirectusSDK = require("@directus/sdk-js");

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
  delete fields.title;
  delete fields.slug;
  delete fields.path;
  delete fields.date;
  delete fields.content;
  delete fields.excerpt;

  return { _id, title, slug, path, date, content, excerpt, fields: sanitizeFields(fields) };
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
      collections: []
    }
  }

  constructor (api, options) {
    this.api = api;
    this.options = options;
    api.loadSource(args => this.fetchContent(args));
  }

  async fetchContent (store) {
    const { addContentType, getContentType, makeTypeName, slugify } = store
    const { apiUrl, project, staticToken, email, password, collections } = this.options

    const direcutsOptions = {
      url: apiUrl,
      project: project,
      token: staticToken
    };
    
    const client = new DirectusSDK(direcutsOptions);
    
    if(email && password) {
      try {
        await client.login(Object.assign({ email, password }, direcutsOptions));
        
        let data = await client.getCollections();
      } catch (e) {
        console.error("DIRECTUS ERROR: Can not login to Directus", e);
        throw "DIRECTUS ERROR: Can not login to Directus";
      }
    }
    
    console.log("DIRECTUS: Loading data from Directus at: " + apiUrl);

    if(collections.length <= 0) {
      throw "DIRECTUS ERROR: No Directus collections specified!";
    }

    for(const collection of collections) {
      let collectionName;
      let params;
      let direcutsPathName;
      if(typeof collection === 'object') {
        collectionName = collection.name;
        direcutsPathName = collection.direcutsPathName || collectionName
        delete collection.name;
        params = collection;
      } else {
        collectionName = collection;
      }

      try {
        let data = await client.getItems(direcutsPathName, params);
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
        
        const contentType = addContentType({
          typeName: makeTypeName(collectionName),
          route: route
        })
        
        for(const item of data) {
          let dd = contentType.addNode(sanitizeItem(item))
        }

      } catch (e) {
        console.error(e);
        throw "DIRECTUS ERROR: Can not load data for collection '" + collectionName + "'!";
      }
    }

    console.log("DIRECTUS: Loading done!");

  }
}

module.exports = DirectusSource
