const ncp = require('ncp').ncp;
const fs = require('fs');
const rimraf = require('rimraf');
const pdir = './production';
if(fs.existsSync('./production'))
  rimraf.sync(pdir);
setTimeout(()=>{
  fs.mkdirSync('./production');
  ncp('./packageForProd.json', './production/package.json', e=> {
    if (e) return console.error(e);
    ncp('./backend/dist', './production/dist', e=> {
      if (e) return console.error(e);
      ncp('./frontend/dist', './production/client', e=> {
        if (e) return console.error(e);
        console.log('done!')
      });
    });
  });
},1000)
