import { QueryDocumentSnapshot, DocumentData, DocumentSnapshot, Firestore, WriteBatch } from "firebase/firestore";
import { whereClause } from "../dataTypes/firebasequery.types";
import { Model } from "../model.interface";
export declare class BaseModel implements Model {
    protected firestorDB?: Firestore;
    protected batch?: WriteBatch;
    protected readonly table: string;
    offset?: QueryDocumentSnapshot<DocumentData>;
    protected currentQuery?: DocumentSnapshot<DocumentData>;
    saveBatch({ data }: {
        data: object[];
    }): Promise<boolean>;
    updateBatch({ data }: {
        data: object[];
    }): Promise<boolean>;
    deleteBatch({ ids }: {
        ids: string[];
    }): Promise<boolean>;
    stream(callBack: (data: DocumentData | DocumentData[]) => void, errorHandler: (error?: unknown) => void, id?: string): void;
    streamWhere(wh: whereClause[], callBack: (data: DocumentData[]) => void, errorHander: (error?: unknown) => void, lim?: number, order?: string): void;
    find(id: string): Promise<DocumentData | boolean>;
    update(data: object, id: string): Promise<boolean>;
    findAll(): Promise<DocumentData[]>;
    findWhere({ wh, lim, order }: {
        wh?: whereClause[];
        lim?: number;
        order?: string;
    }): Promise<DocumentData[]>;
    save(data: object, id?: string | undefined): Promise<string>;
    delete(id: string): Promise<boolean>;
    incrementDecrement({ dbReference, key, isIncrement, incrementalValue }: {
        dbReference: string;
        key: string;
        isIncrement?: boolean;
        incrementalValue?: number;
    }): Promise<boolean>;
    countData(wh: whereClause[]): Promise<number>;
}
