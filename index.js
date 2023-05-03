import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { Configuration, OpenAIApi } from "openai";
import { storeData, searchData } from "./supabase.js"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize the OpenAI API
const config = new Configuration({
    apiKey: process.env.OPENAI_KEY
});
const openai = new OpenAIApi(config);
const PORT = process.env.PORT || 3001;

// fs.watch('./', { recursive: true }, (eventType, filename) => {
//     if (eventType === 'rename' && fs.statSync(filename).isDirectory()) {
//         console.log(`New folder created: ${filename}`);
//         // Call your desired function here
//     }
// });

// Load the documents from the pdf file
const loader = new PDFLoader("fobi/f1.pdf", {
    // you may need to add `.then(m => m.default)` to the end of the import
    pdfjs: () => import("pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js"),
});

const docs = await loader.load()

// Split the documents into chunks of 4000 characters with an overlap of 200 characters
const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1500,
    chunkOverlap: 50,
});


// Function to get the embeddings of the documents and store them in the database

const getEmbeddings = async () => {
    for (var i = 0; i < docs.length; i++) {
        const chunks = await splitter.createDocuments([docs[i].pageContent]);
        // remove non-ascii characters
        chunks.forEach((chunk) => {
            chunk.pageContent = chunk.pageContent.replace(/\x00/g, '');
        });
        console.log(chunks);

        for (let j = 0; j < chunks.length; j++) {
            const embeddings = await openai.createEmbedding({
                model: "text-embedding-ada-002",
                input: chunks[j].pageContent,
            });
            storeData(chunks[j].pageContent, embeddings.data.data[0].embedding);
        }
        console.log(i);
    }
}

// run this only once to get the embeddings of the documents and store them in the database and after that comment it out

//getEmbeddings();



const createUserEmbedding = async (input) => {
    const userEmbedding = await openai.createEmbedding({
        model: "text-embedding-ada-002",
        input: input,
    });
    return userEmbedding;
}

const generateResponse = async (input, context) => {
    const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
            {
                role: "assistant",
                content: `Explain: ${input} using this information only: ${context}. Dont user your own knowledge. Give answers in German Language.`,
            }
        ],
    });
    return response;
}

app.post('/', async (req, res) => {
    try{
    const { query } = req.body;
    const userEmbedding = await createUserEmbedding(query);
    const [{ embedding }] = userEmbedding.data.data;
    console.log(query);
    const result = await searchData(embedding);
    let context = "";
    if (result.length === 0) {
        res.send(
            {
                result: "Sorry, I don't know the answer to that question. Please try again."
            }
        );
        return;
    } else {
        for (let i = 0; i < result.length; i++) {
            context += result[i].content;
        }
    }
    //const fin = await generateResponse(query, context);
    res.send(
        {
            //result: fin.data.choices[0].message.content
            result: context
        }
    );
    } catch (error) {
        console.log(error);
    }
});


app.listen(PORT, (error) => {
    console.log(`Server is running on port ${PORT}`);
});
