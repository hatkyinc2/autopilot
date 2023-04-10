function jsonParseWithValidate(json) {
    try {
        return JSON.parse(json);
    } catch (error) {
        console.log('failed to parse JSON',error,json)
        throw new Error('Invalid JSON');
    }
}
  
module.exports = { jsonParseWithValidate }