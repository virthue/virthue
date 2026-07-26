#!/usr/bin/env node

import FileSystem from "node:fs/promises";
import Path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = Path.dirname(fileURLToPath(import.meta.url));
const projectRoot = Path.join(__dirname, "..", "..");

const swaggerSpec = {
    openapi: "3.0.0",
    info: {
        title: "Philips Hue Bridge API (virthue)",
        description: "Virtual Hue Bridge REST API Documentation",
        version: "1.0.0"
    },
    servers: [
        { url: "http://localhost:80", description: "HTTP" },
        { url: "https://localhost:443", description: "HTTPS" }
    ],
    paths: {},
    components: { schemas: {} }
};

async function extractSwaggerFromFiles() {
    const srcDir = Path.join(projectRoot, "src");
    const files = await findFiles(srcDir, ".js");

    for (const file of files) {
        const content = await FileSystem.readFile(file, "utf-8");
        processFile(content);
    }
}

async function findFiles(dir, extension) {
    const files = [];
    const entries = await FileSystem.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = Path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...await findFiles(fullPath, extension));
        } else if (entry.name.endsWith(extension)) {
            files.push(fullPath);
        }
    }
    return files;
}

function processFile(content) {
    const docRegex = /\/\*\*[\s\S]*?\*\//g;
    const blocks = [];
    let match;

    while ((match = docRegex.exec(content)) !== null) {
        blocks.push(match[0]);
    }

    for (let i = 0; i < blocks.length; i++) {
        const doc = parseDocBlock(blocks[i]);

        if (doc.hasSwagger && doc.schema) {
            // Nächsten Block mit @param zusammenmergen
            if (i + 1 < blocks.length) {
                const nextDoc = parseDocBlock(blocks[i + 1]);
                if (nextDoc.params.length > 0) {
                    doc.params = nextDoc.params;
                }
            }
            processSchema(doc);
        } else if (doc.hasSwagger && doc.swagger) {
            processSwaggerDefinition(doc);
        }
    }
}

function parseDocBlock(docBlock) {
    const doc = {
        summary: "",
        params: [],
        returns: null,
        deprecated: false,
        swagger: null,
        schema: null,
        tags: [],
        hasSwagger: false
    };

    const lines = docBlock.split("\n");
    let captureText = true;

    for (const line of lines) {
        let text = line.replace(/^\s*\/?\*+\s?/, "").replace(/\s*\*\/\s*$/, "").trim();

        if (!text) continue;

        if (text.startsWith("@swagger")) {
            doc.hasSwagger = true;
            captureText = false;
            const pathMatch = text.match(/@swagger\s+(\S+)\s+(\w+)?/);
            if (pathMatch) {
                doc.swagger = { path: pathMatch[1], method: (pathMatch[2] || "get").toLowerCase() };
            }
            continue;
        }

        if (text.startsWith("@schema")) {
            captureText = false;
            const schemaMatch = text.match(/@schema\s+(\w+)/);
            if (schemaMatch) {
                doc.schema = schemaMatch[1];
            }
            continue;
        }

        if (text.startsWith("@param")) {
            const paramMatch = text.match(/@param\s+\{([^}]+)\}\s+(\w+)\s*-?\s*(.*)/);
            if (paramMatch) {
                doc.params.push({
                    type: paramMatch[1].trim(),
                    name: paramMatch[2].trim(),
                    description: paramMatch[3].trim()
                });
            }
            continue;
        }

        if (text.startsWith("@returns") || text.startsWith("@return")) {
            const retMatch = text.match(/@returns?\s+\{([^}]+)\}\s*(.*)/);
            if (retMatch) {
                doc.returns = { type: retMatch[1].trim(), description: retMatch[2].trim() };
            }
            continue;
        }

        if (text.startsWith("@tags")) {
            doc.tags = text.replace(/@tags\s+/, "").split(",").map(t => t.trim());
            continue;
        }

        if (text.startsWith("@deprecated")) {
            doc.deprecated = true;
            continue;
        }

        // Nur vor Tags als Summary erfassen
        if (captureText && !doc.summary) {
            doc.summary = text;
        }
    }

    return doc;
}

function processSchema(doc) {
    const schema = {
        type: "object",
        description: doc.summary || "Schema definition"
    };

    if (doc.params.length > 0) {
        schema.properties = {};
        schema.required = [];
        
        for (const param of doc.params) {
            schema.properties[param.name] = {
                type: mapType(param.type),
                description: param.description
            };
            schema.required.push(param.name);
        }
    }

    swaggerSpec.components.schemas[doc.schema] = schema;
    console.log(`✓ Schema: ${doc.schema}`);
}

function processSwaggerDefinition(doc) {
    if (!doc.swagger) return;

    const { path, method } = doc.swagger;

    if (!swaggerSpec.paths[path]) {
        swaggerSpec.paths[path] = {};
    }

    const pathDef = {
        summary: doc.summary,
        tags: doc.tags.length > 0 ? doc.tags : ["API"],
        parameters: [],
        responses: { "200": { description: "OK" } }
    };

    for (const param of doc.params) {
        pathDef.parameters.push({
            name: param.name,
            in: "query",
            schema: { type: mapType(param.type) },
            description: param.description
        });
    }

    swaggerSpec.paths[path][method] = pathDef;
    console.log(`✓ Endpoint: ${method.toUpperCase()} ${path}`);
}

function mapType(jsType) {
    const map = {
        "string": "string", "String": "string",
        "number": "number", "Number": "number",
        "integer": "integer", "Integer": "integer",
        "boolean": "boolean", "Boolean": "boolean",
        "array": "array", "Array": "array",
        "object": "object", "Object": "object"
    };
    return map[jsType] || "string";
}

async function saveSwaggerSpec() {
    const outputDir = Path.join(projectRoot, "docs");
    const outputFile = Path.join(outputDir, "clip-api.swagger.json");

    await FileSystem.mkdir(outputDir, { recursive: true });
    await FileSystem.writeFile(outputFile, JSON.stringify(swaggerSpec, null, 2));
    console.log(`\n✓ Swagger spec: ${outputFile}`);
}

async function main() {
    console.log("Generating Swagger docs...\n");
    await extractSwaggerFromFiles();
    await saveSwaggerSpec();
    console.log("\nDone!");
}

main().catch(e => { console.error(e); process.exit(1); });
