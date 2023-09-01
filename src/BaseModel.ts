import { Firestore, WriteBatch, QueryDocumentSnapshot, DocumentData, doc, collection, DocumentReference, CollectionReference, onSnapshot, where, QueryConstraint, orderBy, getDoc, startAfter, limit, query, updateDoc, getDocs, addDoc, setDoc, deleteDoc, increment, getCountFromServer } from "firebase/firestore";
import { Model } from "./ModelInterface";
import { dbItems, whereClause } from "./constants";
import { errorLogger } from "./helpers";

export class BaseModel implements Model {

    protected firestorDB?: Firestore
    // Get a new write batch
    protected batch?: WriteBatch

    // Database table name
    protected table: string = '';

    // offset data
    offset?: QueryDocumentSnapshot<DocumentData>;


    /**
     * save multiple documents
     * @param param0 
     */
    async saveBatch ({ data }: { data: object[]}): Promise<boolean> {
        const obj = data as dbItems[]
        obj.forEach((document)=>{
            const docRef = document.reference? 
            doc(this.firestorDB!, this.table, document.reference): 
            doc(collection(this.firestorDB!, this.table))
            if(document.reference){
                delete document.reference
            }
            
            this.batch!.set(docRef, document)
        })
        return await this.batch!.commit().then(()=>true).catch((e)=>{
            throw new Error(`Unable to saveBatch ${e}`)
        })
    }

    /**
     * update multiple documents
     * @param param0 
     */
    async updateBatch({ data }: { data: object[] }): Promise<boolean> {
        const obj = data as dbItems[]
        obj.forEach((document)=>{
            const docRef = doc(this.firestorDB!, this.table, document.reference!)
            delete document.reference
            this.batch!.update(docRef, document as object)
        })
        return await this.batch!.commit().then(()=>true).catch((e)=>{
            throw new Error(`Unable to updateBatch: ${e}`)
        })
    }

    /**
     * delete multiple documents
     * @param param0 
     */
    async deleteBatch({ ids }: { ids: string[]  }): Promise<boolean> {
        ids.forEach((id)=>{
            const docRef = doc(this.firestorDB!, this.table, id)
            this.batch!.delete(docRef)
        })
        return await this.batch!.commit().then(()=>true).catch((e)=>{
            throw new Error(`Unable to deleteBatch: ${e}`)
        })
    }



    /**
     * Get realtime update from the database
     * @param id 
     */
    stream(callBack: (data:  DocumentData | DocumentData[])=>void, errorHandler:(error?: unknown)=>void, id?: string ): void { 
    
        const ref:DocumentReference<DocumentData> | CollectionReference<DocumentData> = id? 
            doc(this.firestorDB!, this.table, id):
            collection(this.firestorDB!, this.table)
        try {
                if(id){
                    onSnapshot(ref as DocumentReference, (doc) => {
                        callBack({...doc.data()!, reference: ref.id})
                    })
                }else{
                    onSnapshot(ref as CollectionReference, (snapShot) => {
                        callBack(
                            snapShot.docs.map((value)=>{
                                const data = {...value.data(), reference: value.id}
                                return data
                            })
                        )
                    })
                }
        } catch (error) {
            errorHandler(error)
        }
    }

    /**
     * Get realtime value from database with where clause
     * @param wh 
     * @param lim 
     * @param order 
     */
    async streamWhere(wh: whereClause[], callBack: (data: DocumentData[])=>void,  errorHander: (error?: unknown)=>void, lim?:number, order?: string, offset?: string): Promise<void> {
        const whereParameter = wh.map(clause=> where(
            clause.key, 
            clause.operator, 
            clause.value))
        let constraint: QueryConstraint[] = []
        // add where parameter
        if(wh){
            constraint.push(...whereParameter)
        }
        // add order by
        if(order){
            constraint.push(orderBy(order))
        }
        // add offset
        if(offset){
            const off  =  await getDoc(doc(this.firestorDB!, offset));
            constraint.push(startAfter(off))
        }
        // add limit
        if(lim){
            // 
            constraint.push(limit(lim))
        }
        const ref: CollectionReference<DocumentData> = collection(this.firestorDB!, this.table, )
        try {
                onSnapshot(query(
                    ref,  
                    ...constraint
                ), (snapShot) => {
                    callBack(snapShot.docs.map((value)=>{
                        const data = {...value.data(), reference: value.id}
                        return data
                    }))
                })
        } catch (error) {
                errorHander(error)
        }
    }

    /**
     * Fetch a single item from database
     * @param id 
     */
    async find(id: string ): Promise<DocumentData | boolean> {
        try {
            const ref = doc(this.firestorDB!, this.table, id)
            const docSnap = await getDoc(ref)
            if (docSnap.exists()) {
                return {...docSnap.data(), reference: ref.id}
            } 
            return false
        } catch (error) {
            throw new Error(`Unable to find: ${error}`)
        }
    }

    /**
     * Update part of a data
     * @param data 
     * @param id 
     * @returns 
     */
    async update(data: dbItems, id: string): Promise<boolean> {
        delete data.reference
        const docRef = doc(this.firestorDB!, this.table, id)
        return await updateDoc(docRef, data)
        .then(()=>true).catch((e)=>{
            throw new Error(`Unable to update: ${e}`)
        })
    }

    /**
     * Get all items from database
     * @returns void
     */
    async findAll() : Promise<DocumentData[]> {
        try {
            const snaptshots =  await getDocs(collection(this.firestorDB!, this.table))
            if(!snaptshots.empty){
                return snaptshots.docs.map((document)=>{
                    return {...document.data(), reference: document.id}
                })
            }else{
                return []
            }
        } catch (error) {
            throw new Error(`Cannot findAll: ${error}`)
        }
    }

    /**
     * perform complex query
     * @param param0 
     */
    async findWhere( {wh, lim, order, offset}:  {wh?: whereClause[], lim?:number, order?:string, offset?: string}): Promise<DocumentData[]> {
        // get Collection reference
        const colRef = collection(this.firestorDB!, this.table)
        // set where clause
        const whereParameter = wh?wh.map(clause=> where(
            clause.key, 
            clause.operator, 
            clause.value)):[]
        let constraint: QueryConstraint[] = []
        // add where parameter
        if(wh){
            constraint.push(...whereParameter)
        }
        // add order by
        if(order){
            constraint.push(orderBy(order))
        }
        // add offset
        if(offset){
            const off  =  await getDoc(doc(this.firestorDB!, offset));
            constraint.push(startAfter(off))
        }
        // add limit
        if(lim){
            constraint.push(limit(lim))
        }
        // fetch data
        try {
            const snapshot = await getDocs(
                query(
                    colRef,  
                    ...constraint
                )
            )
            if(!snapshot.empty){
                return snapshot.docs.map(document=>{
                    return {...document.data(), reference: document.id}
                })
            }else{ return [] }
            
        } catch (error) {
            throw new Error(`Unable to findWhere: ${error}`)
        }
    }

    /**
     * create or update data
     * @param data 
     */
    async save(data: dbItems, id?: string | undefined): Promise<string | boolean> {
        delete data.reference
        try {
            if(id===undefined){
                const documentRef = await addDoc(collection(this.firestorDB!, this.table), data)
                return documentRef.id
            } else {
                await setDoc(doc(this.firestorDB!, this.table, id!), data).then(()=>id).catch((e)=>{
                    throw new Error(`Unable to save: ${e}`)
                })
                return id!
            }
                    
        } catch (error) {
            errorLogger("save error: ", error)
            return false
        }
    }

    /**
     * Delete document from database
     * @param id 
     */
    async delete(id: string): Promise<boolean> {
        return await deleteDoc(doc(this.firestorDB!, this.table, id)).then(()=>true).catch(error=>{
            throw new Error(`Unable to delete: ${error}`)
        })
    }

    /**
     * Increment or decrement counters
     * @param param0 
     */
    async incrementDecrement({dbReference, key, isIncrement = true, incrementalValue}: 
        {dbReference: string, key:string, isIncrement?:boolean, incrementalValue?: number}): Promise<boolean>{
        const docRef = doc(this.firestorDB!, this.table, dbReference)
        const value = isIncrement?incrementalValue??1:(incrementalValue??1) * -1
        return await updateDoc(docRef, {[key]: increment(value)})
        .then(()=>true).catch((e)=>{
            throw new Error(`Unable to incrementDecrement: ${e}`)
        })
    }

    /**
     * Count data in database
     * @param {whereClause[]} wh - query parameter (e.g. [
     * {
     *  key: string,
     * value: any,
     * operator: == , !=, >, < etc
     * }]) 
     */
    async countData(wh: whereClause[]): Promise<number> {

        // set parameter
        const qryParameter = wh.map(clause=> where(
            clause.key, 
            clause.operator, 
            clause.value))

        const qry = query(
            collection(this.firestorDB!, this.table),  
            ...qryParameter
        )
        return await getCountFromServer(qry).then((agg)=>{
            return agg.data().count
        }).catch((e)=>{
            throw new Error(`Unable to countData: ${e}`)
        })
    }
}