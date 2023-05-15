import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js'
dotenv.config();
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// store data in supabase

const storeData = async (content, embedding, metadata) => {
    const { data: user, error } = await supabase
        .from('documents3')
        .insert([
            { content: content, embedding: embedding, metadata: metadata },
        ])
    if (error) {
        console.log(error)
    }

}

const searchData = async (query) => {
    const queryEmbedding = query
    const matchCount = 5
    let { data, error } = await supabase
        .rpc('match_all_data', {
            query_embedding: queryEmbedding,
            match_count: matchCount
        });

    if (error) {
        console.error(error);
        return;
    }
    return data;
}

export {
    storeData,
    searchData
};
