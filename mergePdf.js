import { LightningElement, api,wire } from "lwc";
import { NavigationMixin } from 'lightning/navigation';
import pdflib from "@salesforce/resourceUrl/pdflib";
import { loadScript } from "lightning/platformResourceLoader";
import getData from '@salesforce/apex/DocData.getData';
import getRecordsId from '@salesforce/apex/DocData.getRecordsId';


export default class CreatePDF extends NavigationMixin(LightningElement) {

    @api recordId
    docData = []
    error
    ids ='' 

    @wire(getRecordsId, {
        accId: '$recordId'
    }) wiredContacts({ error, data }) {
        if (data) {
         this.ids = data
         console.log('data Id '+this.ids)
         this.navigateToFiles()
        }
    } 

    renderedCallback() {
        loadScript(this, pdflib).then(() => {
        });

        console.log('recode ud  ' + this.recordId)
        if (this.recordId) {
            getData({ accountId: this.recordId })
                .then((result) => {
                    this.docData = JSON.parse(JSON.stringify(result));
                    console.log('Size of File are ' + this.docData.length)
                    this.error = undefined;
//                   this.createPdf()
                })
                .catch((error) => {
                    console.log('error while calling ' + error)
                }
                )
        }
    }

    async createPdf() {
        const pdfDoc = await PDFLib.PDFDocument.create();
        console.log('pdfDoc is ', pdfDoc)
        if (this.docData.length < 1)
            return


        var tempBytes = Uint8Array.from(atob(this.docData[0]), (c) => c.charCodeAt(0));
        console.log('tempBytes', tempBytes)
        const [firstPage] = await pdfDoc.embedPdf(tempBytes);
        const americanFlagDims = firstPage.scale(0.99);
        var page = pdfDoc.addPage();
        console.log('page is ', page)

        page.drawPage(firstPage, {
            ...americanFlagDims,
            x: page.getWidth() - americanFlagDims.width,
            y: page.getHeight() - americanFlagDims.height - 10,
        });


        if (this.docData.length > 1) {
            for (let i = 1; i < this.docData.length; i++) {
                tempBytes = Uint8Array.from(atob(this.docData[i]), (c) => c.charCodeAt(0));
                console.log('tempBtes>> ', tempBytes)
                page = pdfDoc.addPage();
                const usConstitutionPdf = await PDFLib.PDFDocument.load(tempBytes);
                console.log('After ', usConstitutionPdf, usConstitutionPdf.getPages())
                const preamble = await pdfDoc.embedPage(usConstitutionPdf.getPages()[0]);
                console.log(' Inside page is ', page)

                const preambleDims = preamble.scale(0.95);

                page.drawPage(preamble, {
                    ...preambleDims,
                    x: page.getWidth() - americanFlagDims.width,
                    y: page.getHeight() - americanFlagDims.height - 10,
                });
            }

        }
        const pdfBytes = await pdfDoc.save();
        this.saveByteArray("My PDF", pdfBytes);
    }
    saveByteArray(pdfName, byte) {
        var blob = new Blob([byte], { type: "application/pdf" });
        var link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        var fileName = pdfName;
        link.download = fileName;
        link.click();
    }

    navigateToFiles() {
        this[NavigationMixin.Navigate]({
          type: 'standard__namedPage',
          attributes: {
              pageName: 'filePreview'
          },
          state : {
              recordIds: this.ids,
              
          }
        })
      }
}
