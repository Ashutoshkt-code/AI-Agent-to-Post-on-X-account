import { config } from 'dotenv';

/*since express works with import only we are changing the consts to import*/

import readline from 'readline/promises';
import { GoogleGenerativeAI } from '@google/generative-ai'

/*instance to create further mcp clients 22.18*/



import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { version } from 'os';
import { url } from 'inspector';
config()


/*integrating gemini, we can use any ai model but at some extinct they ask for money and gemini is free so..*/

console.log("Loaded API Key:", process.env.GEMINI_API_KEY);

/*after loading from .env file it will fetch here*/

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
/*now creating the mcp client here*/



const mcpClient = new Client({
    name:"example-client",
    version: "1.0.0",
    
})



/*function to take input from user and give it to the ai*/

const chatHistory = [];
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});



/*creating a main function& transport to help communicate the client and the server  , passing the server url, as it is a promise we will use then*/


mcpClient.connect(new StreamableHTTPClientTransport(new URL("http://localhost:3000/mcp")))
.then(async() => {

    console.log("connected to the MCP server")


    /* creating access of what tools we have, it dont directly return so pass another parameter .tools*/
    const tools = (await mcpClient.listTools()).tools;
    console.log("Available tools:", tools);
})


async function chatLoop() {
    /*we have to ask question from the user*/

    const question = await rl.question('you: ');

    /*we have to save the input given by the user, like ek baar user msg krega then model reply krega and vice versa */


    chatHistory.push({
        role: "user",
        parts: [{ text: question }]
    });

    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent({
        contents: chatHistory
    });

    const response = await result.response.text();
    console.log("gemini:", response);
    chatLoop();
}

chatLoop();
