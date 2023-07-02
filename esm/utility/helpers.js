"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moneyFormatter = exports.generateRandomString = void 0;
const generateRandomString = (length) => {
    if (length > 40) {
        throw new Error(`Maximum generatable character is 40, ${length} was required`);
    }
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
};
exports.generateRandomString = generateRandomString;
const moneyFormatter = (x) => {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};
exports.moneyFormatter = moneyFormatter;
//# sourceMappingURL=helpers.js.map