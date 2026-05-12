import { db } from './firebase';
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    getDoc,
    doc,
    Timestamp,
    limit
} from 'firebase/firestore';

export interface SharedProofConfig {
    id?: string;
    walletAddress: string;
    intervalType: '3m' | '6m' | '1y' | 'custom';
    startDate: number;
    endDate: number;
    allowedVaults: string[]; // List of vault addresses included
    createdAt: number;
    expiresAt: number;
}

const PROOFS_COLLECTION = 'shared_proofs';

/**
 * Save a shared proof configuration
 */
export async function createSharedProof(config: Omit<SharedProofConfig, 'id' | 'createdAt' | 'expiresAt'>): Promise<string> {
    try {
        const createdAt = Date.now();
        const expiresAt = createdAt + (30 * 24 * 60 * 60 * 1000); // 30 days expiry

        const docRef = await addDoc(collection(db, PROOFS_COLLECTION), {
            ...config,
            createdAt,
            expiresAt,
            firebaseCreatedAt: Timestamp.now()
        });
        
        console.log('[ProofService] Shared proof created with ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('[ProofService] Error creating shared proof:', error);
        throw error;
    }
}

/**
 * Get a shared proof by ID
 */
export async function getSharedProofById(id: string): Promise<SharedProofConfig | null> {
    try {
        const docRef = doc(db, PROOFS_COLLECTION, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            // Check expiry
            if (data.expiresAt < Date.now()) {
                console.warn('[ProofService] Proof has expired:', id);
                return null;
            }
            return { id: docSnap.id, ...data } as SharedProofConfig;
        } else {
            return null;
        }
    } catch (error) {
        console.error('[ProofService] Error fetching shared proof:', error);
        return null;
    }
}
