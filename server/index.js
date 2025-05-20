/*It is the boilerplate code of mcp server from docs and i am changing the necessary needs as per my client requirement*/
import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { type } from "node:os";
import { text } from "node:stream/consumers";

const app = express();
app.use(express.json());

/*multiple user transport can be stored here*/

const transports = {};

app.post('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'];
    let transport;

    if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (newSessionId) => {
                transports[newSessionId] = transport;
            }
        });

        transport.onclose = () => {
            if (transport.sessionId) {
                delete transports[transport.sessionId];
            }
        };

        const server = new McpServer({
            name: "example-server",
            version: "1.0.0"
        });

        /*we will create a simple tool here by targeting the server*/

        server.tool(
            /*here we create two parameters of string type 1st tells about the parameter and the another string is its description, then we pass the schema for structure. */
            "addTwoNumbers",
            "Add two numbers",
            /* for making the schema we will install zod dependency*/
            {
                a: z.number(),
                b: z.number(),

            },
            
           async (arg ) =>{
            const { a, b } = args;

            /*the return statement of these tools are bit different, we can not directly use a+b*/


            return[
                {
                    type:"text",
                    text: `The sum of ${a} and ${b} is ${a + b}`
                }
            ]

            }
        )



        // TODO: Add your tools, resources, or prompts here if needed

        await server.connect(transport);
    } else {
        res.status(400).json({
            jsonrpc: '2.0',
            error: {
                code: -32000,
                message: 'Bad Request: No valid session ID provided',
            },
            id: null,
        });
        return;
    }

    await transport.handleRequest(req, res, req.body);
});

const handleSessionRequest = async (req, res) => {
    const sessionId = req.headers['mcp-session-id'];
    if (!sessionId || !transports[sessionId]) {
        res.status(400).send('Invalid or missing session ID');
        return;
    }

    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
};

app.get('/mcp', handleSessionRequest);
app.delete('/mcp', handleSessionRequest);

app.listen(3000, () => {
    console.log('MCP server listening on http://localhost:3000/mcp');
});
