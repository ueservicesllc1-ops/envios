import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB...", // Just mocking process.env isn't going to work directly. Wait, the app is running locally, we can read env!
};
