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
