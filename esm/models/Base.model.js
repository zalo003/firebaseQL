"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseModel = void 0;
const firestore_1 = require("firebase/firestore");
class BaseModel {
    constructor() {
        this.table = '';
    }
    async saveBatch({ data }) {
        const obj = data;
        obj.forEach((document) => {
            const docRef = document.reference ?
                (0, firestore_1.doc)(this.firestorDB, this.table, document.reference) :
                (0, firestore_1.doc)((0, firestore_1.collection)(this.firestorDB, this.table));
            if (document.reference) {
                delete document.reference;
            }
            (this.batch.set(docRef, document));
        });
        return await this.batch.commit().then(() => true).catch((e) => {
            throw new Error(`Unable to saveBatch ${e}`);
        });
    }
    async updateBatch({ data }) {
        const obj = data;
        obj.forEach((document) => {
            const docRef = (0, firestore_1.doc)(this.firestorDB, this.table, document.reference);
            delete document.reference;
            this.batch.update(docRef, document);
        });
        return await this.batch.commit().then(() => true).catch((e) => {
            throw new Error(`Unable to updateBatch: ${e}`);
        });
    }
    async deleteBatch({ ids }) {
        ids.forEach((id) => {
            const docRef = (0, firestore_1.doc)(this.firestorDB, this.table, id);
            this.batch.delete(docRef);
        });
        return await this.batch.commit().then(() => true).catch((e) => {
            throw new Error(`Unable to deleteBatch: ${e}`);
        });
    }
    stream(callBack, errorHandler, id) {
        const ref = id ?
            (0, firestore_1.doc)(this.firestorDB, this.table, id) :
            (0, firestore_1.collection)(this.firestorDB, this.table);
        try {
            if (id) {
                (0, firestore_1.onSnapshot)(ref, (doc) => {
                    callBack({ ...doc.data(), reference: ref.id });
                });
            }
            else {
                (0, firestore_1.onSnapshot)(ref, (snapShot) => {
                    callBack(snapShot.docs.map((value) => {
                        const data = { ...value.data(), reference: value.id };
                        return data;
                    }));
                });
            }
        }
        catch (error) {
            errorHandler(error);
        }
    }
    streamWhere(wh, callBack, errorHander, lim, order) {
        const whereParameter = wh.map(clause => (0, firestore_1.where)(clause.key, clause.operator, clause.value));
        let constraint = [];
        if (wh) {
            constraint.push(...whereParameter);
        }
        if (order) {
            constraint.push((0, firestore_1.orderBy)(order));
        }
        if (this.offset) {
            constraint.push((0, firestore_1.startAfter)(this.offset));
        }
        if (lim) {
            constraint.push((0, firestore_1.limit)(lim));
        }
        const ref = (0, firestore_1.collection)(this.firestorDB, this.table);
        try {
            (0, firestore_1.onSnapshot)((0, firestore_1.query)(ref, ...constraint), (snapShot) => {
                callBack(snapShot.docs.map((value) => {
                    const data = { ...value.data(), reference: value.id };
                    return data;
                }));
            });
        }
        catch (error) {
            errorHander(error);
        }
    }
    async find(id) {
        try {
            const ref = (0, firestore_1.doc)(this.firestorDB, this.table, id);
            const docSnap = await (0, firestore_1.getDoc)(ref);
            if (docSnap.exists()) {
                return { ...docSnap.data(), reference: ref.id };
            }
            return false;
        }
        catch (error) {
            throw new Error(`Unable to find: ${error}`);
        }
    }
    async update(data, id) {
        const docRef = (0, firestore_1.doc)(this.firestorDB, this.table, id);
        return await (0, firestore_1.updateDoc)(docRef, data)
            .then(() => true).catch((e) => {
            throw new Error(`Unable to update: ${e}`);
        });
    }
    async findAll() {
        try {
            const snaptshots = await (0, firestore_1.getDocs)((0, firestore_1.collection)(this.firestorDB, this.table));
            if (!snaptshots.empty) {
                return snaptshots.docs.map((document) => {
                    return { ...document.data(), reference: document.id };
                });
            }
            else {
                return [];
            }
        }
        catch (error) {
            throw new Error(`Cannot findAll: ${error}`);
        }
    }
    async findWhere({ wh, lim, order }) {
        const colRef = (0, firestore_1.collection)(this.firestorDB, this.table);
        const whereParameter = wh ? wh.map(clause => (0, firestore_1.where)(clause.key, clause.operator, clause.value)) : [];
        let constraint = [];
        if (wh) {
            constraint.push(...whereParameter);
        }
        if (order) {
            constraint.push((0, firestore_1.orderBy)(order));
        }
        if (this.offset) {
            constraint.push((0, firestore_1.startAfter)(this.offset));
        }
        if (lim) {
            constraint.push((0, firestore_1.limit)(lim));
        }
        try {
            const snapshot = await (0, firestore_1.getDocs)((0, firestore_1.query)(colRef, ...constraint));
            if (!snapshot.empty) {
                return snapshot.docs.map(document => {
                    return { ...document.data(), reference: document.id };
                });
            }
            else {
                return [];
            }
        }
        catch (error) {
            throw new Error(`Unable to findWhere: ${error}`);
        }
    }
    async save(data, id) {
        try {
            if (id === undefined) {
                const documentRef = await (0, firestore_1.addDoc)((0, firestore_1.collection)(this.firestorDB, this.table), data);
                return documentRef.id;
            }
            else {
                await (0, firestore_1.setDoc)((0, firestore_1.doc)(this.firestorDB, this.table, id), data).then(() => id).catch((e) => {
                    throw new Error(`Unable to save: ${e}`);
                });
                return id;
            }
        }
        catch (error) {
            throw new Error(`Unable to save: ${error}`);
        }
    }
    async delete(id) {
        return await (0, firestore_1.deleteDoc)((0, firestore_1.doc)(this.firestorDB, this.table, id)).then(() => true).catch(error => {
            throw new Error(`Unable to delete: ${error}`);
        });
    }
    async incrementDecrement({ dbReference, key, isIncrement = true, incrementalValue }) {
        const docRef = (0, firestore_1.doc)(this.firestorDB, this.table, dbReference);
        const value = isIncrement ? incrementalValue !== null && incrementalValue !== void 0 ? incrementalValue : 1 : (incrementalValue !== null && incrementalValue !== void 0 ? incrementalValue : 1) * -1;
        return await (0, firestore_1.updateDoc)(docRef, { [key]: (0, firestore_1.increment)(value) })
            .then(() => true).catch((e) => {
            throw new Error(`Unable to incrementDecrement: ${e}`);
        });
    }
    async countData(wh) {
        const qryParameter = wh.map(clause => (0, firestore_1.where)(clause.key, clause.operator, clause.value));
        const qry = (0, firestore_1.query)((0, firestore_1.collection)(this.firestorDB, this.table), ...qryParameter);
        return await (0, firestore_1.getCountFromServer)(qry).then((agg) => {
            return agg.data().count;
        }).catch((e) => {
            throw new Error(`Unable to countData: ${e}`);
        });
    }
}
exports.BaseModel = BaseModel;
//# sourceMappingURL=Base.model.js.map