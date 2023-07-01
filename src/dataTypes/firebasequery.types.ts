import { WhereFilterOp } from "firebase/firestore"

/**
 * firebase where clause
 */
export type whereClause = {
    key: string,
    operator: WhereFilterOp,
    value: any
}

/**
 *  firebase where clause operators
 */
export enum WHEREOPERATOR {
    LESS_THAN = '<',
    GREATER_THAN = '>',
    EQUAL_TO = '==',
    LESS_OR_EQUAL_TO = '<=',
    GREATER_OR_EQUAL_TO = '>=',
    NOT_EQUAL_TO = '!=',
    ARRAY_CONTAINS = 'array-contains',
    ARRAY_CONTAINS_ANY = 'array-contains-any',
    IN = 'in',
    NOT_IN = 'not-in'
}

export interface dbItems  {
    reference?: string,
  }


export type CounterDocumentData = {
    auctionedVehicles: number,
    brandNewVehicles: number,
    usedVehicles: number,
    forAuction: number,
    orders: number,
    salvagedVehicles: number,
    soldVehicles: number,
    forSale: number,
    users: number
}

export type FunctionReturn = {
    data?: any
}