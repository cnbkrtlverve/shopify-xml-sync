import { Request, Response } from 'express';
import ShopifyService from '../services/shopifyService';
import XmlService from '../services/xmlService';

class SyncController {
    private shopifyService: ShopifyService;
    private xmlService: XmlService;

    constructor() {
        this.shopifyService = new ShopifyService();
        this.xmlService = new XmlService();
    }

    public async startSync(req: Request, res: Response): Promise<void> {
        try {
            const xmlConnectionStatus = await this.xmlService.checkConnection();
            const shopifyConnectionStatus = await this.shopifyService.checkConnection();

            if (xmlConnectionStatus && shopifyConnectionStatus) {
                const xmlData = await this.xmlService.fetchXmlData();
                await this.shopifyService.syncProducts(xmlData);
                res.status(200).json({ message: 'Synchronization successful', xmlConnectionStatus, shopifyConnectionStatus });
            } else {
                res.status(500).json({ message: 'Connection failed', xmlConnectionStatus, shopifyConnectionStatus });
            }
        } catch (error) {
            res.status(500).json({ message: 'An error occurred during synchronization', error: error.message });
        }
    }
}

export default SyncController;