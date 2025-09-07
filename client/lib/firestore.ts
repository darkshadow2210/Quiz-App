import { db } from "./firebase";
import { collection, doc, getDoc, getDocs, query, setDoc, deleteDoc } from "firebase/firestore";
import type { Quiz } from "@shared/api";

const quizzesCol = collection(db, "quizzes");

export async function saveQuizDoc(q: Quiz) {
  const ref = doc(db, "quizzes", q.id);
  await setDoc(ref, { ...q });
}

export async function deleteQuizDoc(id: string) {
  const ref = doc(db, "quizzes", id);
  await deleteDoc(ref);
}

export async function listQuizDocs(): Promise<Pick<Quiz, "id" | "code" | "title" | "createdAt" | "updatedAt" | "questions">[]> {
  const snap = await getDocs(query(quizzesCol));
  return snap.docs.map((d) => d.data() as any);
}

export async function getQuizDoc(id: string): Promise<Quiz | null> {
  const dref = doc(db, "quizzes", id);
  const snap = await getDoc(dref);
  if (!snap.exists()) return null;
  return snap.data() as Quiz;
}
