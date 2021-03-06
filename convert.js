const inquirer = require('inquirer');
const fs = require('fs');
const marked = require('marked');
const { JSDOM } = require('jsdom');
const Prism = require('prismjs');

function getInput(categories) {
  categories.push("New Category");

  const questions = [
    {
      name: "md_path",
      type: "input",
      message: "Path to md file:",
      validate: (input) => {return input !== ''},
    },
    {
      name: "category",
      type: "list",
      message: "Choose category",
      choices: categories,
    },
    {
      name: "new_category",
      type: "input",
      message: "Name for new category:",
      when: (answers) => answers.category === "New Category",
      validate: (input) => {return input !== ''},
    },
    {
      name: "brief",
      type: "input",
      message: "Brief:",
      validate: (input) => {return input !== ''},
    },
    {
      name: "title",
      type: "input",
      message: "Title:",
      validate: (input) => {return input !== ''},
    },
    {
      name: "header_img",
      type: "input",
      message: "Path to header image:",
      validate: (input) => {return input !== ''},
    },
  ];
  return inquirer.prompt(questions);
}

async function run() {
  const types = ["projects", "blogs"];
  const { type } = await inquirer.prompt({
    name: "type",
    type: "list",
    message: "Type of post",
    choices: types,
  });

  let catalog = JSON.parse(fs.readFileSync(`./public/${type}/catalog.json`)).catalog;
  let { md_path, category, new_category, brief, title, header_img } = await getInput(catalog.map(cat => cat.name));
  brief = brief.replace(/ /g,'-').toLowerCase();
  const dir = `./public/${type}/${brief}`;
  const t = new Date();
  
  if (new_category) {
    catalog.push({
      name: new_category,
      items: [],
    });
    category = new_category;
  }
  category = catalog.filter(cat => cat.name === category)[0];

  fs.readFile(md_path, 'utf8', (err, data) => {
    
    if (err?.code === 'ENOENT') {
      return console.error('md file not found');
    } else {
      fs.copyFile(header_img, `${dir}/header.png`, (err) => {
        if (err?.code === 'ENOENT') {
          return console.error('header image not found');
        }
      });
      console.log('Creating new post...');
      category.items.push(brief);
    }
    fs.writeFileSync(`${dir}/catalog.json`, JSON.stringify({ catalog }, null, 2));

    const html = marked(data);
    const dom = new JSDOM(html, {
      contentType: 'text/html'
    });
    
    Prism.highlightAllUnder(dom.window.document);
    console.log('Creating directory...');
    fs.mkdir(dir, (err) => {
      if (err) {
        console.log('Dir already exists');
      }
    });
    
    console.log('Creating meta.json...');
    fs.writeFile(`${dir}/meta.json`,
    JSON.stringify({ title, date: `${t.getFullYear()}-${t.getMonth()+1}-${t.getDate()}`}, null, 2),
    (err) => {
      if (err) {
        return console.error(err);
      }
      console.log('meta.json file created');
    });
    
    let images = dom.window.document.getElementsByTagName('img');
    for (let i = 0; i < images.length; i++) {
      if (images[i].src === undefined) {
        continue;
      }
      
      let filename = images[i].src.split('/').pop();
      let newSrc = `${dir}/${filename}`;
      fs.copyFile(
        images[i].src,
        newSrc,
        (err) => {
          if (err) {
            console.log(err);
          }
        });
        images[i].src = `./${type}/${brief}/${filename}`;
      }
      
      console.log('Creating html file...');
      fs.writeFile(`${dir}/content.html`, dom.window.document.body.outerHTML, (err) => {
        if (err) {
          return console.error(err);
        }
        console.log('html file created');
      });
  });
}

run();