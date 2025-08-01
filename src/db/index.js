import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

//function to connect to the database
const connectDb = async () => {
    try {
        const response = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        console.log(`MongoDB connected! DB Host: ${response.connection.host}`);
    } catch (error) {
        console.log('Db connection Err', error);
        process.exit(1);
    }
}

export default connectDb;