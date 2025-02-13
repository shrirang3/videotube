import { mongoose } from "mongoose";
import {DB_NAME} from "../constants.js";




// const MONGO_URI='mongodb+srv://shrirang3:lamineyamal@cluster0.kviav.mongodb.net'

const connectDB=async ()=>{
    try {
        const connectionInstance=await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
        console.log(`\n MongoDB connected!! DB Host: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MONGO connection error", error);
        process.exit(1);
    }
}

export default connectDB;
