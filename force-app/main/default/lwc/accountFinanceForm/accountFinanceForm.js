import { LightningElement, wire, api, track } from 'lwc';
import { deleteRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord, getFieldValue } from "lightning/uiRecordApi";

import getAccountId from '@salesforce/apex/FinanceFormController.getAccountId';
import getFiles from '@salesforce/apex/FinanceFormController.getFiles';
import getBillingCountryCodes from '@salesforce/apex/FinanceFormController.getBillingCountryAndCurrencyCodes';

import ARE_ALL_FIELDS_FILLED_OUT from "@salesforce/schema/Account.isRequiredFieldsAreFilled__c";


const fields = [ARE_ALL_FIELDS_FILLED_OUT];

export default class AccountFinanceForm extends LightningElement {

    @api accountFieldApi;
    @api recordId;
    @api objectApiName;
    @track uploadedFiles
    bankCountry = '';
    currancy = '';

    accountId;
    isReadOnlyMode;
    billingCountryOptions;
    currencyOptions;
    isSaveDisabled;
    rerenderOnce = false;
    fieldPath = this.objectApiName + '.' +  this.accountFieldApi
    isWindowExpanded = false;

    renderedCallback(){

        if(!this.rerenderOnce && this.fieldsAreFilledOut !== undefined){

            this.isSaveDisabled = !this.fieldsAreFilledOut;
            this.isReadOnlyMode = this.fieldsAreFilledOut;
            this.rerenderOnce = true;
        }
    }

    @wire(getRecord, { recordId: "$accountId", fields })
    account;

    @wire(getBillingCountryCodes)
    wiredBillingCountryAndCurrencyCodes({ error, data }) {
        if (data) {
            this.billingCountryOptions = data.countries.map(country => {
                return { label: country, value: country };
            });

            this.currencyOptions = data.currencies.map(currency => {
                return { label: currency, value: currency };
            });
        } else if (error) {
            console.error('Error:', error);
        }
    }

    @wire(getAccountId, { childRecordId: '$recordId', childObjectApi: '$objectApiName', lookupField: '$accountFieldApi' })
    wiredGetAccountId({ error, data }) {
        if (data) {
            this.accountId = data.Id;
            this.bankCountry = data.Bank_Country__c;
            this.currancy = data.Currancy__c;
        } else if (error) {
            console.error('Error:', error);
        }
    }

    @wire(getFiles, { accId: '$accountId' })
    wiredGetFiles({ error, data }) {
        if (data) {
            this.uploadedFiles = data.map(item => ({ ...item, Url: '/sfc/servlet.shepherd/document/download/' + item.ContentDocumentId }));
        } else if (error) {
            console.error('Error:', error);
        }
    }
  
    get fieldsAreFilledOut() {
      return getFieldValue(this.account.data, ARE_ALL_FIELDS_FILLED_OUT);
    }

    get changeIcon(){

        return this.isWindowExpanded ? 'utility:chevrondown' : 'utility:chevronright';
    }

    get acceptedFormats() {
        return ['.pdf', '.jpg', '.png'];
    }

    get getLogoColor(){

        return this.isWindowExpanded === true ? 'icon-red-expanded' : 'icon-gray-collapse';
    }

    get getLogoText(){

        if(this.isWindowExpanded === true){ 
            return this.isReadOnlyMode === false ? 'text-bold-expanded' : 'text-normal-expanded';
        }
        return  this.fieldsAreFilledOut === false ? 'text-bold-collapse' : 'text-normal-collapse';
    }

    handleSubmit(event) {

        event.preventDefault();
        event.detail.fields.Bank_Country__c = this.bankCountry;
        event.detail.fields.Currancy__c = this.currancy;
        event.detail.fields.isRequiredFieldsAreFilled__c = true;
        this.template.querySelector('lightning-record-edit-form').submit(event.detail.fields);
    }

    changeFormMode(){

        this.isReadOnlyMode = !this.isReadOnlyMode;
        this.isSaveDisabled = false;

    }

    handleBankCountryChange(event) {
        this.bankCountry = event.detail.value;
        this.handleFieldChange();
    }

    handleCurrancyChange(event) {
        this.currancy = event.detail.value;
        this.handleFieldChange();
    }

    handleFieldChange() {

        this.isSaveDisabled = !this.validateFields();
    }

    handleFileUpload(event) {

        this.filesUploaded = event.detail.files;
    }

    validateFields() {

        const inputFieldsValid = [...this.template.querySelectorAll('lightning-input-field')]
        .reduce((validSoFar, field) => validSoFar && field.reportValidity(), true);
    
        const comboBoxValid = [...this.template.querySelectorAll('lightning-combobox')]
        .reduce((validSoFar, combobox) => validSoFar && combobox.reportValidity(), true);

        return (inputFieldsValid && comboBoxValid) && this.uploadedFiles?.length > 0;
    }

    handleToggleClick() {
        this.isWindowExpanded = !this.isWindowExpanded;
    }



    handleUploadFinished(event){

        const newFiles = event.detail.files.map(file => ({
            Name: 'Screenshot ' + file.name, 
            ContentDocumentId: file.documentId,
            Url: '/sfc/servlet.shepherd/document/download/' + file.documentId
        }));

        this.uploadedFiles = [...this.uploadedFiles, ...newFiles];
    }

    async deleteFile(event){

        const recordId = event.target.dataset.item;
        try {
            await deleteRecord(recordId);
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'File deleted',
                    variant: 'success'
                })
            );
            this.uploadedFiles = this.uploadedFiles.filter(
                (file) => file.ContentDocumentId !== recordId
              );
        } catch (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error deleting record',
                    message: reduceErrors(error).join(', '),
                    variant: 'error'
                })
            );
        }
    }
}


