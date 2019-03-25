# gridsome-source-directus
Gridsome Source Plugin to load data from Directus CMS

## Install
- yarn add gridsome-source-directus

OR

- npm install gridsome-source-directus

## Usage
Add the plugin to your gridsome.config.js file.

Example configuration:
```js
module.exports = {
  plugins: [
    {
      use: 'gridsome-source-directus',
      options: {
        apiUrl: 'YOUR_API_URL',
        project: 'YOUR_PROJECT_NAME OR _ FOR THE DEFAULT PROJECT',
        email: 'EMAIL_OF_DIRECUTS_USER',
        password: 'PASSWORD_OF_DIRECTUS_USER',
        collections: [
          {
            name: 'posts',
            status: 'published',
            fields: '*.*'
          },
          {
            name: 'articel',
            hasRoute: true,
            fields: '*.*.*'
          },
          {
            name: 'products',
            direcutsPathName: '`direcutsproducts',
            route: '/product/:slug',
            fields: '*.*.*'
          }
        ]
      }
    }
  ]
}
```

### Authenticication
You have to create a direcuts user with the correct access rights (read) for the collections you want to fetch.

Simply add the email and password to the plugin options and the plugin will login via the credentials.

### Fetching the collections
To fetch your collections, you have mutiple options. Each collection is an object in the collections array of the plugin options.

It can have the following properties:
- `name` - The name of the collection (in Direcuts)
- `fields` - The fields direcuts should load
- `hasRoute` (optional) - If set to true, Gridsome will create a page from the data (with the schema `collection-name/:slug`). [See Templates for mor information](https://gridsome.org/docs/templates)
- `direcutsPathName` (optional) - If you want to have a different name in Gridsome, you can specify a direcutsPathName (collection name). This is handy, if you want to load data twice (e.g. for easy translation).
- `route` (optional) - If set, Gridsome will create pages with this route schema.

Additionaly you can add aditional query parameters that are getting past along to direcuts.
[See the official Direcuts documentation for mor info](https://docs.directus.io/api/reference.html#query-parameters)