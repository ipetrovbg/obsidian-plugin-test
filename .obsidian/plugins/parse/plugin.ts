import { Plugin } from 'obsidian';


const tableString = `
# some text here

and some text here too

| column(Column,string) | secondColum(Second Column, string) | 
| --------------------- | ---------------------------------- |
| data                  | data in second column              |
test

`;

// console.log(tableString);


export default class DataTablePlugin extends Plugin {
    async onload() {
        console.log(tableString);
    }

    onunload() {
		console.log('unloading plugin');
	}
}
