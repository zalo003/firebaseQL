import { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { whereClause } from './dataTypes/firebasequery.types';
export interface Model {
    offset?: QueryDocumentSnapshot<DocumentData>;
    find(id: string): Promise<DocumentData | boolean>;
    findAll(): Promise<DocumentData[]>;
    findWhere({ wh, lim, order }: {
        wh?: whereClause[];
        lim?: number;
        order?: string;
    }): Promise<DocumentData[]>;
    save(data: object, id?: string): Promise<string>;
    delete(id: string): Promise<boolean>;
    update(data: object, id: string): Promise<boolean>;
    stream(callBack: (data: DocumentData | DocumentData[]) => void, errorHandler: (error?: unknown) => void, id?: string): void;
    streamWhere(wh: whereClause[], callBack: (data: DocumentData[]) => void, errorHander: (error?: unknown) => void, lim?: number, order?: string): void;
    countData(where: whereClause[]): Promise<number>;
    saveBatch({ data }: {
        data: object[];
    }): Promise<boolean>;
    updateBatch({ data }: {
        data: object[];
        callBack: () => void;
        errorHandler: (error?: any) => void;
    }): Promise<boolean>;
    deleteBatch({ ids }: {
        ids: string[];
    }): Promise<boolean>;
    incrementDecrement({ dbReference, key, isIncrement, incrementalValue }: {
        dbReference: string;
        key: string;
        isIncrement?: boolean;
        incrementalValue?: number;
    }): Promise<boolean>;
}
