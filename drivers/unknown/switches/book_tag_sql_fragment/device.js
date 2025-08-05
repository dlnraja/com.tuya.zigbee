'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Book_tag_sql_fragmentDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('book_tag_sql_fragment device initialized');
        this.log('Source: D:\Download\Compressed\katana\PortableApps\FirefoxPortable\App\Firefox\components\nsPlacesAutoComplete.js');
        this.log('Original file: nsPlacesAutoComplete.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Book_tag_sql_fragmentDevice;
