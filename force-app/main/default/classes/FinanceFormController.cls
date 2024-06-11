public with sharing class FinanceFormController {
    

    /**
     * @description Retrieves the Account record based on the child record's lookup field.
     * 
     * @param childRecordId The ID of the child record.
     * @param childObjectApi The API name of the child object.
     * @param lookupField The API name of the lookup field on the child object that references the Account.
     * @return The Account record if found; otherwise, null.
     * @throws AuraHandledException if an exception occurs during the database query.
    **/
    @AuraEnabled(cacheable=true)
    public static Account getAccountId(String childRecordId, String childObjectApi, String lookupField) {
        try {
            String queryString = 'SELECT ' + lookupField + ' FROM ' + childObjectApi + ' WHERE Id = :childRecordId LIMIT 1';
            SObject childRecord = Database.query(queryString);
            if (childRecord != null && childRecord.get(lookupField) != null) {
                Id accountId = (Id)childRecord.get(lookupField);
                return [SELECT Id, Name, Bank_Country__c, Currancy__c FROM Account WHERE Id = :accountId LIMIT 1];
            } else {
                return null;
            }
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    /**
     * @description Retrieves a list of files linked to the specified Account ID, wrapped in ContentDocumentLinkWrapper.
     * 
     * @param accId The ID of the Account.
     * @return A list of ContentDocumentLinkWrapper objects representing the files linked to the Account.
     * @throws AuraHandledException if an exception occurs during the database query.
    **/
    @AuraEnabled(cacheable=true)
    public static List<ContentDocumentLinkWrapper> getFiles(String accId){

        List<ContentDocumentLinkWrapper> wrappedFiles = new List<ContentDocumentLinkWrapper>();
        try {
            List<ContentDocumentLink> files = [
                SELECT ContentDocumentId,ContentDocument.Title,ContentDocument.FileType 
                FROM ContentDocumentLink 
                WHERE LinkedEntityId =: accId];

            for(ContentDocumentLink file : files){

                ContentDocumentLinkWrapper wrappedFile = new ContentDocumentLinkWrapper();
                wrappedFile.Name = 'Screenshoot ' + file.ContentDocument.Title + '.' + (String)file.ContentDocument.FileType.toLowerCase();
                wrappedFile.ContentDocumentId = file.ContentDocumentId;

                wrappedFiles.add(wrappedFile);
            }
            return wrappedFiles;
        }catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }


    /**
     * @description Retrieves a list of billing country codes from the Account object.
     * 
     * @return A list of billing country codes.
     * @throws AuraHandledException if an exception occurs during the retrieval of picklist values.
    **/
    @AuraEnabled(cacheable=true)
    public static Map<String, List<String>> getBillingCountryAndCurrencyCodes() {
        // Get billing country codes
        Schema.DescribeFieldResult billingFieldResult = Account.BillingCountryCode.getDescribe();
        List<Schema.PicklistEntry> billingPicklistValues = billingFieldResult.getPicklistValues();
        List<String> billingCountryCodes = new List<String>();
        
        for (Schema.PicklistEntry country : billingPicklistValues) {
            billingCountryCodes.add(country.getLabel());
        }
        
        // Get currency ISO codes
        Schema.DescribeFieldResult currencyFieldResult = Account.CurrencyIsoCode.getDescribe();
        List<Schema.PicklistEntry> currencyPicklistValues = currencyFieldResult.getPicklistValues();
        List<String> currencyIsoCodes = new List<String>();
        
        for (Schema.PicklistEntry curr : currencyPicklistValues) {
            currencyIsoCodes.add(curr.getValue() + ' - ' + curr.getLabel());
        }
        
        // Combine results into a map
        Map<String, List<String>> resultMap = new Map<String, List<String>>();
        resultMap.put('countries', billingCountryCodes);
        resultMap.put('currencies', currencyIsoCodes);
        
        return resultMap;
    }
    /**
     * @description Wrapper class for ContentDocumentLink records, containing only the necessary fields.
     * @param Name The Name of File record.
     * @param ContentDocumentId The ID of file record.
    **/
    class ContentDocumentLinkWrapper {
    
        @AuraEnabled public String Name;
        @AuraEnabled public String ContentDocumentId;
    }
}
