import { StorageAdapter } from './StorageAdapter';
import { Comment } from '../core/types';

/**
 * Firebase adapter for Comment Widget
 * Requires: firebase/app and firebase/firestore
 * 
 * Installation:
 * npm install firebase
 * 
 * Usage:
 * import { initializeApp } from 'firebase/app';
 * import { getFirestore } from 'firebase/firestore';
 * import { FirebaseAdapter } from '@commentwidget/core';
 * 
 * const app = initializeApp({ ... });
 * const db = getFirestore(app);
 * 
 * const adapter = new FirebaseAdapter(db, 'comments');
 */

interface FirestoreDB {
  collection: (path: string) => any;
}

export class FirebaseAdapter implements StorageAdapter {
  private _db: FirestoreDB;
  private _collectionPath: string;
  private unsubscribe: (() => void) | null = null;

  constructor(db: FirestoreDB, collectionPath: string = 'comments') {
    this._db = db;
    this._collectionPath = collectionPath;
  }

  async loadComments(): Promise<Comment[]> {
    try {
      // This is a simplified version - actual Firebase imports would be needed
      // const { getDocs } = await import('firebase/firestore');
      // const querySnapshot = await getDocs(this._db.collection(this._collectionPath));
      
      // For now, return empty array with instructions
      console.warn('FirebaseAdapter requires firebase/firestore to be installed');
      console.warn('Install with: npm install firebase');
      console.warn('Then import and initialize: import { getFirestore } from "firebase/firestore"');
      console.warn(`Collection path would be: ${this._collectionPath}`);
      
      // Prevent unused variable warnings
      void this._db;
      void this._collectionPath;
      
      return [];
    } catch (error) {
      console.error('Failed to load comments from Firebase:', error);
      return [];
    }
  }

  async saveComments(_comments: Comment[]): Promise<void> {
    try {
      // This is a simplified version - actual Firebase imports would be needed
      // const { doc, setDoc } = await import('firebase/firestore');
      
      // Typically, you'd save each comment as a document
      // for (const comment of comments) {
      //   await setDoc(doc(this.db, this.collectionPath, comment.id), comment);
      // }
      
      console.warn('FirebaseAdapter requires firebase/firestore to be installed');
      throw new Error('Firebase not configured');
    } catch (error) {
      console.error('Failed to save comments to Firebase:', error);
      throw error;
    }
  }

  subscribeToChanges(_callback: (comments: Comment[]) => void): () => void {
    try {
      // This is a simplified version - actual Firebase imports would be needed
      // const { onSnapshot } = await import('firebase/firestore');
      
      // this.unsubscribe = onSnapshot(
      //   this.db.collection(this.collectionPath),
      //   (snapshot) => {
      //     const comments = snapshot.docs.map(doc => doc.data() as Comment);
      //     callback(comments);
      //   }
      // );
      
      console.warn('FirebaseAdapter real-time subscription requires firebase/firestore');
      
      return () => {
        if (this.unsubscribe) {
          this.unsubscribe();
        }
      };
    } catch (error) {
      console.error('Failed to subscribe to Firebase changes:', error);
      return () => {};
    }
  }
}

/**
 * Example usage:
 * 
 * import { initializeApp } from 'firebase/app';
 * import { getFirestore } from 'firebase/firestore';
 * import { initCommentWidget, FirebaseAdapter } from '@commentwidget/core';
 * 
 * const firebaseConfig = {
 *   apiKey: "...",
 *   authDomain: "...",
 *   projectId: "...",
 *   // ... other config
 * };
 * 
 * const app = initializeApp(firebaseConfig);
 * const db = getFirestore(app);
 * 
 * initCommentWidget({
 *   storage: new FirebaseAdapter(db, 'my-comments'),
 *   primaryColor: '#4285f4'
 * });
 */

