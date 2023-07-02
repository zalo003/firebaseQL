import { WhereFilterOp } from "firebase/firestore";
export type whereClause = {
    key: string;
    operator: WhereFilterOp;
    value: any;
};
export declare enum WHEREOPERATOR {
    LESS_THAN = "<",
    GREATER_THAN = ">",
    EQUAL_TO = "==",
    LESS_OR_EQUAL_TO = "<=",
    GREATER_OR_EQUAL_TO = ">=",
    NOT_EQUAL_TO = "!=",
    ARRAY_CONTAINS = "array-contains",
    ARRAY_CONTAINS_ANY = "array-contains-any",
    IN = "in",
    NOT_IN = "not-in"
}
export type dbItems = {
    reference?: string;
};
