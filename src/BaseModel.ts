import { Firestore, 
    QueryDocumentSnapshot, 
    DocumentData, doc, 
    collection, DocumentReference, 
    CollectionReference, onSnapshot, where, 
    QueryConstraint, orderBy, getDoc, startAfter, 
    limit, query, updateDoc, getDocs, addDoc, 
    setDoc, deleteDoc, increment, getCountFromServer, 
    writeBatch
} from "firebase/firestore";
import { Model } from "./ModelInterface";
import { dbItems, whereClause } from "./constants";

export class BaseModel implements Model {

    protected firestorDB?: Firestore
    // Get a new write batch
    // protected batch?: WriteBatch

    // Database table name
    private table: string = '';

    // offset data
    offset?: QueryDocumentSnapshot<DocumentData>;

    constructor(table: string){
        this.table = table
    }


    /**
     * save multiple documents
     * @param param0 
     */
    async saveBatch ({ data }: { data: object[]}): Promise<boolean> {
        try {
            const batch = writeBatch(this.firestorDB!)
            const obj = data as dbItems[]
            obj.forEach((document)=>{
                const docRef = document.reference? 
                doc(this.firestorDB!, this.table, document.reference): 
                doc(collection(this.firestorDB!, this.table))
                if(document.reference){
                    delete document.reference
                }
                
                batch.set(docRef, document)
            })
            await batch.commit()
            return true
        } catch (error) {
            throw new Error(`saveBatch: , ${error}`)
        }
    }

    /**
     * update multiple documents
     * @param param0 
     */
    async updateBatch({ data }: { data: object[] }): Promise<boolean> {
        try {
            const batch = writeBatch(this.firestorDB!)
            const obj = data as dbItems[]
            obj.forEach((document)=>{
                const docRef = doc(this.firestorDB!, this.table, document.reference!)
                delete document.reference
                batch.update(docRef, document as object)
            })
            await batch.commit()
            return true
        } catch (error) {
            throw new Error(`updateBatch: , ${error}`)
        }
    }

    /**
     * delete multiple documents
     * @param param0 
     */
    async deleteBatch({ ids }: { ids: string[]  }): Promise<boolean> {
        try {
            const batch = writeBatch(this.firestorDB!)
            ids.forEach((id)=>{
                const docRef = doc(this.firestorDB!, this.table, id)
                batch.delete(docRef)
            })
            await batch.commit()
            return true
        } catch (error) {
            throw new Error(`deleteBatch: , ${error}`)
        }
    }



    /**
     * Get realtime update from the database
     * @param id 
     */
    stream(callBack: (data:  DocumentData | DocumentData[] | undefined)=>void, id?: string ): void { 
    
        const ref:DocumentReference<DocumentData> | CollectionReference<DocumentData> = id? 
            doc(this.firestorDB!, this.table, id):
            collection(this.firestorDB!, this.table)
        try {
            if(id){
                onSnapshot(ref as DocumentReference, (doc) => {
                    callBack({...doc.data(), reference: ref.id})
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
            throw new Error(`stream: , ${error}`)
        }
    }

    /**
     * Get realtime value from database with where clause
     * @param wh 
     * @param lim 
     * @param order 
     */
    async streamWhere(wh: whereClause[], callBack: (data: DocumentData[])=>void,  lim?:number, order?: string, offset?: string): Promise<void> {
        try {
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
            throw new Error(`streamWhere: , ${error}`)
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
                return {...docSnap.data(), reference: id}
            } 
            return false
        } catch (error) {
            throw new Error(`find: , ${error}`)
        }
    }

    /**
     * check if data exists
     * @param id 
     * @returns 
     */
    async dataExists(id: string): Promise<boolean> {
        try {
            const ref = doc(this.firestorDB!, this.table, id);
            const docSanp = await getDoc(ref);
            return docSanp.exists()
        } catch (error) {
            throw new Error(`dataExists: , ${error}`)
        }
    }

    /**
     * Update part of a data
     * @param data 
     * @param id 
     * @returns 
     */
    async update(data: any, id: string): Promise<boolean> {
        try {
            delete data.reference
            const docRef = doc(this.firestorDB!, this.table, id)
            await updateDoc(docRef, data)
            return true
        } catch (error) {
            throw new Error(`update: , ${error}`)
        }
    }

    /**
     * Get all items from database
     * @returns void
     */
    async findAll(ids?: string[]) : Promise<DocumentData[]> {
        try {
            const colRef = collection(this.firestorDB!, this.table)
            if(ids){
                const results: DocumentData[] = []
                for (let id of ids){
                    const item = await this.find(id)
                    if(item){
                        results.push(item as DocumentData)
                    }
                }
                return results
            } else {
                const snaptshots =  await getDocs(colRef)
                if(!snaptshots.empty){
                    return snaptshots.docs.map((document)=>{
                        return {...document.data(), reference: document.id}
                    })
                }else{
                    return []
                }
            }
            
        } catch (error) {
            throw new Error(`findAll: , ${error}`)
        }
    }

    /**
     * perform complex query
     * @param param0 
     */
    async findWhere( {wh, lim, order, offset}:  {wh?: whereClause[], lim?:number, order?:string, offset?: string}): Promise<DocumentData[]> {
        try {
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
                const off  =  await getDoc(doc(this.firestorDB!, this.table, offset));
                constraint.push(startAfter(off))
            }
            // add limit
            if(lim){
                constraint.push(limit(lim))
            }
            // fetch data
        
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
            throw new Error(`findWhere: ${error}`)
            return []
        }
    }

    /**
     * create or update data
     * @param data 
     */
    async save(data: any, id?: string | undefined): Promise<string | boolean> {
        delete data.reference
        try {
            if(id===undefined){
                const documentRef = await addDoc(collection(this.firestorDB!, this.table), data)
                return documentRef.id
            } else {
                await setDoc(doc(this.firestorDB!, this.table, id!), data)
                return id!
            }
                    
        } catch (error) {
            throw new Error(`save error: , ${error}`)
        }
    }

    /**
     * Delete document from database
     * @param id 
     */
    async delete(id: string): Promise<boolean> {
        try {
            await deleteDoc(doc(this.firestorDB!, this.table, id))
            return true
        } catch (error) {
            throw new Error(`delete: , ${error}`)
        }
    }

    /**
     * Increment or decrement counters
     * @param param0 
     */
    async incrementDecrement({dbReference, key, isIncrement = true, incrementalValue}: 
        {dbReference: string, key:string, isIncrement?:boolean, incrementalValue?: number}): Promise<boolean>{
        
            try {
                const docRef = doc(this.firestorDB!, this.table, dbReference)
                const value = isIncrement?incrementalValue??1:(incrementalValue??1) * -1
                await updateDoc(docRef, {[key]: increment(value)})
                return true
            } catch (error) {
                throw new Error(`incrementDecrement: , ${error}`)
            }
    }

    /**
     * Count data in database
     * @param {whereClause[]} wh - query parameter (e.g. [
     * {
     */
    async countData(wh: whereClause[]): Promise<number> {
        try {
            
        // set parameter
        const qryParameter = wh.map(clause=> where(
            clause.key, 
            clause.operator, 
            clause.value))

        const qry = query(
            collection(this.firestorDB!, this.table),  
            ...qryParameter
        )
        const aggregate = await getCountFromServer(qry)
        return aggregate.data().count
        } catch (error) {
            throw new Error(`countData error: ,${error}`)
        }
    }
}