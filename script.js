function initStorage() {
    if (!localStorage.getItem('brands')) 
        localStorage.setItem('brands', JSON.stringify([]));
    if (!localStorage.getItem('products')) 
        localStorage.setItem('products', JSON.stringify([]));
    if (!localStorage.getItem('bills')) 
        localStorage.setItem('bills', JSON.stringify([]));
}

// Call initStorage when the page loads
window.onload = initStorage;

function getCurrentBillNumber() {
    return parseInt(localStorage.getItem('currentBillNumber')) || 1;
}

function incrementBillNumber() {
    const nextNumber = getCurrentBillNumber() + 1;
    localStorage.setItem('currentBillNumber', nextNumber);
    return nextNumber - 1; // Return the current number before increment
}

function loadStaffDropdown() {
    const staffSelect = document.getElementById('staff-select');
    staffSelect.innerHTML = '<option value="">Select Staff</option>'; // Clear existing options

    const staffList = JSON.parse(localStorage.getItem('staff')) || [];
    staffList.forEach(staff => {
        const option = document.createElement('option');
        option.value = staff.id; // Use staff ID as the value
        option.textContent = `${staff.name} (${staff.role})`;
        staffSelect.appendChild(option);
    });
}

// Navigation
function showSection(sectionName) {
    const sections = ['products', 'billing', 'reports'];
    sections.forEach(section => {
        const sectionElement = document.getElementById(`${section}-section`);
        sectionElement.style.display = section === sectionName ? 'block' : 'none';
    });

    // Refresh data when switching sections
    if (sectionName === 'products') loadProductsList();
    if (sectionName === 'billing') loadBrandsList();
    if (sectionName === 'reports') generateReport();
}

async function checkAndSendPendingMessages() {
    if (!checkNetworkStatus()) return;

    const pendingMessages = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
    if (pendingMessages.length === 0) return;

    console.log(`Found ${pendingMessages.length} pending messages to send`);
    showNotification(`Attempting to send ${pendingMessages.length} pending messages...`, 'info');

    const successfulMessages = [];
    const failedMessages = [];

    for (const message of pendingMessages) {
        try {
            const success = await sendTelegramMessage(message);
            if (success) {
                successfulMessages.push(message);
            } else {
                failedMessages.push(message);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            failedMessages.push(message);
        }
    }

    // Update pending messages to only include failed ones
    localStorage.setItem('pendingMessages', JSON.stringify(failedMessages));

    if (successfulMessages.length > 0) {
        showNotification(`Successfully sent ${successfulMessages.length} pending messages`, 'success');
    }
    if (failedMessages.length > 0) {
        showNotification(`Failed to send ${failedMessages.length} messages. Will retry when connection improves.`, 'error');
    }
}

// Show the Billing section by default on page load
window.onload = function() {
    initStorage();
    loadStaffDropdown();
    showSection('billing');
    loadBrandsList();
    loadProductsList('');
    generateReport();
    checkAndSendPendingMessages();
};

let isManualBrand = false;
let isManualProduct = false;

function toggleBrandInput() {
    const selectElement = document.getElementById('billing-brand');
    const manualInput = document.getElementById('billing-brand-manual');
    isManualBrand = !isManualBrand;
    
    selectElement.style.display = isManualBrand ? 'none' : 'block';
    manualInput.style.display = isManualBrand ? 'block' : 'none';
    
    // Clear values when switching
    selectElement.value = '';
    manualInput.value = '';
    
    // Update product list if switching back to dropdown
    if (!isManualBrand) {
        updateProductList();
    }
}

function toggleProductInput() {
    const selectElement = document.getElementById('billing-product');
    const manualInput = document.getElementById('billing-product-manual');
    isManualProduct = !isManualProduct;
    
    selectElement.style.display = isManualProduct ? 'none' : 'block';
    manualInput.style.display = isManualProduct ? 'block' : 'none';
    
    // Clear values when switching
    selectElement.value = '';
    manualInput.value = '';
    manualPrice.value = '';
}

// Brand Management
function addBrand() {
    try {
        const brandName = document.getElementById('brand-name').value.trim();
        if (!brandName) {
            alert('Please enter a brand name.');
            return;
        }
        const brands = JSON.parse(localStorage.getItem('brands')) || [];
        const newBrand = {
            id: Date.now(),
            name: brandName,
            description: brandDescription || ''
        };
        brands.push(newBrand);
        localStorage.setItem('brands', JSON.stringify(brands));
        document.getElementById('brand-name').value = '';
        document.getElementById('brand-description').value = '';
        loadBrandsList();
        alert('Brand added successfully!');
    } catch (error) {
        console.error('Error adding brand:', error);
        alert('Failed to add the brand. Please try again.');
    }
}

// Product Management
function addProduct() {
    const brandSelect = document.getElementById('product-brand');
    const productName = document.getElementById('product-name').value.trim();
    const brandId = brandSelect.value;

    if (!brandId || !productName) {
        alert('Please fill all product details');
        return;
    }

    const products = JSON.parse(localStorage.getItem('products')) || [];
    const newProduct = {
        id: Date.now(),
        brandId: brandId,
        name: productName
    };

    products.push(newProduct);
    localStorage.setItem('products', JSON.stringify(products));

    document.getElementById('product-name').value = '';
    filterProductsByBrand();
}

function loadBrandsList() {
    try {
        const brands = JSON.parse(localStorage.getItem('brands')) || [];
        const brandSelects = [
            document.getElementById('product-brand'),
            document.getElementById('billing-brand')
        ];

        // Clear existing options
        brandSelects.forEach(select => {
            select.innerHTML = '<option value="">Select Brand</option>';
            brands.forEach(brand => {
                const option = document.createElement('option');
                option.value = brand.id;
                option.textContent = brand.name;
                select.appendChild(option);
            });
        });
    } catch (error) {
        console.error('Error loading brands:', error);
    }
}

function loadProductsList(filterBrandId = '') {
    const products = JSON.parse(localStorage.getItem('products'));
    const brands = JSON.parse(localStorage.getItem('brands'));
    const tableBody = document.getElementById('products-table-body');
    
    tableBody.innerHTML = '';

    const filteredProducts = filterBrandId 
        ? products.filter(product => product.brandId == filterBrandId)
        : products;
    
    if (filteredProducts.length === 0) {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td colspan="3" style="text-align: center;">
                ${filterBrandId ? 'No products found for this brand' : 'No products available'}
            </td>
        `;
        return;
    }

    filteredProducts.forEach(product => {
        const brand = brands.find(b => b.id == product.brandId);
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td style="text-align: center;">${brand ? brand.name : 'Unknown'}</td>
            <td style="text-align: center;">${product.name}</td>
            <td style="text-align: center;">
                <button class="btn btn-danger" onclick="deleteProduct(${product.id})">
                    <i class="icon">×</i> Delete
                </button>
            </td>
        `;
    });
}

function deleteProduct(productId) {
    const products = JSON.parse(localStorage.getItem('products'));
    const filteredProducts = products.filter(p => p.id != productId);
    localStorage.setItem('products', JSON.stringify(filteredProducts));

    loadProductsList();
    filterProductsByBrand();
}

// Billing Section
function updateProductList() {
    const brandId = document.getElementById('billing-brand').value;
    const productSelect = document.getElementById('billing-product');
    const products = JSON.parse(localStorage.getItem('products'));

    productSelect.innerHTML = '<option value="">Select Product</option>';
    products.filter(p => p.brandId == brandId).forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = product.name;
        productSelect.appendChild(option);
    });
}

function filterProductsByBrand() {
    const selectedBrandId = document.getElementById('product-brand').value;
    loadProductsList(selectedBrandId);
}

function validateCustomerInfo() {
    const customerName = document.getElementById('customer-name').value.trim();
    const customerMobile = document.getElementById('customer-mobile').value.trim();
    const customerAddress = document.getElementById('customer-address').value.trim();

    if (!customerName || !customerMobile || !customerAddress) {
        alert('Please fill in all customer details');
        return null;
    }

    if (!/^[0-9]{10}$/.test(customerMobile)) {
        alert('Please enter a valid 10-digit mobile number');
        return null;
    }

    return {
        name: customerName,
        mobile: customerMobile,
        address: customerAddress
    };
}

let currentBillItems = [];

function addProductToBill() {
    let brandName, productName, brandId;
    const quantity = parseFloat(document.getElementById('billing-quantity').value);
    const units = parseFloat(document.getElementById('billing-units').value);
    const price = parseFloat(document.getElementById('billing-manual-price').value);

    if (!quantity || quantity <= 0 || !price || price <= 0 || !units || units <= 0) {
        alert('Please enter valid quantity and price');
        return;
    }

    // Handle brand selection/entry
    if (isManualBrand) {
        brandName = document.getElementById('billing-brand-manual').value.trim();
        if (!brandName) {
            alert('Please enter a brand name');
            return;
        }
        // Save new brand if it doesn't exist
        const brands = JSON.parse(localStorage.getItem('brands')) || [];
        let brand = brands.find(b => b.name.toLowerCase() === brandName.toLowerCase());
        if (!brand) {
            brand = {
                id: Date.now(),
                name: brandName,
                description: ''
            };
            brands.push(brand);
            localStorage.setItem('brands', JSON.stringify(brands));
        }
        brandId = brand.id;
    } else {
        const brandSelect = document.getElementById('billing-brand');
        if (!brandSelect.value) {
            alert('Please select a brand');
            return;
        }
        brandId = brandSelect.value;
        const brands = JSON.parse(localStorage.getItem('brands'));
        const brand = brands.find(b => b.id == brandId);
        brandName = brand.name;
    }

    // Handle product selection/entry
    if (isManualProduct) {
        productName = document.getElementById('billing-product-manual').value.trim();
        if (!productName) {
            alert('Please enter product name');
            return;
        }
        // Save new product if it doesn't exist
        const products = JSON.parse(localStorage.getItem('products')) || [];
        let product = products.find(p => 
            p.brandId == brandId && 
            p.name.toLowerCase() === productName.toLowerCase()
        );
        if (!product) {
            product = {
                id: Date.now(),
                brandId: brandId,
                name: productName
            };
            products.push(product);
            localStorage.setItem('products', JSON.stringify(products));
        }
    } else {
        const productSelect = document.getElementById('billing-product');
        if (!productSelect.value) {
            alert('Please select a product');
            return;
        }
        const products = JSON.parse(localStorage.getItem('products'));
        const product = products.find(p => p.id == productSelect.value);
        productName = product.name;
    }

    const billItem = {
        productId: isManualProduct ? `manual-${Date.now()}` : document.getElementById('billing-product').value,
        brandName: brandName,
        productName: productName,
        quantity: quantity,
        units: units,
        price: price
    };

    currentBillItems.push(billItem);
    updateBillItemsTable();
    loadBrandsList();
    updateProductList();

    // Clear inputs
    document.getElementById('billing-quantity').value = '';
    document.getElementById('billing-units').value = '';
    document.getElementById('billing-manual-price').value = '';
    if (isManualProduct) {
        document.getElementById('billing-product-manual').value = '';
    }
    if (isManualBrand) {
        document.getElementById('billing-brand-manual').value = '';
    }
}

function updateProductPrice() {
    const productId = document.getElementById('billing-product').value;
    if (!productId) return;

    const products = JSON.parse(localStorage.getItem('products'));
    const product = products.find(p => p.id == productId);
}

function updateBillItemsTable() {
    const tableBody = document.getElementById('bill-items-body');
    tableBody.innerHTML = '';
    let subtotal = 0;

    currentBillItems.forEach((item, index) => {
        const itemTotal = item.quantity * item.price;
        subtotal += itemTotal;

        const row = tableBody.insertRow();
        row.innerHTML = `
            <td style="text-align: center;"><strong>${item.brandName}</strong> - ${item.productName}</td>
            <td style="text-align: center;">${item.quantity} KG</td>
            <td style="text-align: center;">${item.units}</td>
            <td style="text-align: center;">₹${item.price.toFixed(2)}</td>
            <td style="text-align: center;">₹${itemTotal.toFixed(2)}</td>
            <td style="text-align: center;">
                <button class="btn btn-danger" onclick="removeFromBill(${index})">Remove</button>
            </td>
        `;
    });

    updateBillTotals(subtotal);
}

function updateBillTotals(subtotal = null) {
    if (subtotal === null) {
        subtotal = currentBillItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    }

    const transportCharges = parseFloat(document.getElementById('transport-charges').value) || 0;
    const extraCharges = parseFloat(document.getElementById('extra-charges').value) || 0;
    
    const grandTotal = subtotal + transportCharges + extraCharges;

    document.getElementById('bill-subtotal').textContent = subtotal.toFixed(2);
    document.getElementById('transport-amount').textContent = transportCharges.toFixed(2);
    document.getElementById('extra-amount').textContent = extraCharges.toFixed(2);
    document.getElementById('bill-total-amount').textContent = grandTotal.toFixed(2);
}

function removeFromBill(index) {
    currentBillItems.splice(index, 1);
    updateBillItemsTable();
}

function formatBillDetailsForTelegram(bill) {
    const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString();
    const formatTime = (dateStr) => new Date(dateStr).toLocaleTimeString();

    let message = `🧾 *NEW ESTIMATE GENERATED*\n\n`;
    message += `Estimate No: *${bill.billNumber}*\n`;
    message += `Date: ${formatDate(bill.date)}\n`;
    message += `Time: ${formatTime(bill.date)}\n\n`;

    // Customer Details
    message += `*CUSTOMER DETAILS*\n`;
    message += `Name: ${bill.customer.name}\n`;
    message += `Mobile: ${bill.customer.mobile}\n`;
    message += `Address: ${bill.customer.address}\n\n`;

    // Staff Details
    message += `*STAFF DETAILS*\n`;
    message += `Name: ${bill.staff.name}\n`;
    message += `Role: ${bill.staff.role}\n\n`;

    // Items
    message += `*ITEMS*\n`;
    bill.items.forEach((item, index) => {
        message += `${index + 1}. ${item.brandName} - ${item.productName}\n`;
        message += `   Count (Units): ${item.units}\n`;
        message += `   Qty: ${item.quantity}KG x ₹${item.price}/KG = ₹${(item.quantity * item.price).toFixed(2)}\n`;
    });

    // Bill Summary
    message += `\n*ESTIMATE SUMMARY*\n`;
    message += `Subtotal: ₹${bill.subtotal.toFixed(2)}\n`;
    if (bill.transportCharges) message += `Transport: ₹${bill.transportCharges.toFixed(2)}\n`;
    if (bill.extraCharges) message += `Extra Charges: ₹${bill.extraCharges.toFixed(2)}\n`;
    message += `*TOTAL AMOUNT: ₹${bill.totalAmount.toFixed(2)}*`;

    return encodeURIComponent(message);
}

function checkNetworkStatus() {
    return navigator.onLine;
}

// Show notification message
function showNotification(message, type = 'error') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background-color: ${type === 'error' ? '#ff4444' : '#44bb44'};
        color: white;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.5s ease-out;
    `;

    notification.textContent = message;
    document.body.appendChild(notification);

    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.5s ease-in';
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

async function sendTelegramMessage(message) {
    if (!checkNetworkStatus()) {
        console.log('No network connection, storing message for later');
        const pendingMessages = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
        if (!pendingMessages.includes(message)) {
            pendingMessages.push(message);
            localStorage.setItem('pendingMessages', JSON.stringify(pendingMessages));
        }
        return false;
    }

    const botToken = '6330850455:AAEr7XSfLqodb1Pl3srqU_9yYnErANni9No';
    const chatId = '1001979192306';
    const url = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${message}&parse_mode=Markdown`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.ok) {
            throw new Error(`Telegram API Error: ${data.description}`);
        }
        return true;
    } catch (error) {
        console.error('Failed to send message:', error);
        const pendingMessages = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
        if (!pendingMessages.includes(message)) {
            pendingMessages.push(message);
            localStorage.setItem('pendingMessages', JSON.stringify(pendingMessages));
        }
        showNotification('Message queued for retry when connection is restored', 'info');
        return false;
    }
}

window.addEventListener('online', () => {
    showNotification('Network connection restored', 'success');
    checkAndSendPendingMessages();
});

window.addEventListener('offline', () => {
    showNotification('Network connection lost. Messages will be sent when connection is restored.', 'error');
});

const styleSheet = document.createElement('style');
styleSheet.textContent = `
@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}
`;
document.head.appendChild(styleSheet);

function generateBill() {
    if (currentBillItems.length === 0) {
        alert('Please add items to the bill');
        return;
    }

    const customerInfo = validateCustomerInfo();
    if (!customerInfo) {
        return;
    }

    const staffId = document.getElementById('staff-select').value;
    if (!staffId) {
        alert('Please select a staff member');
        return;
    }

    const staffList = JSON.parse(localStorage.getItem('staff')) || [];
    const staff = staffList.find(s => s.id == staffId);

    const billNumber = incrementBillNumber();
    const subtotal = currentBillItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const transportCharges = parseFloat(document.getElementById('transport-charges').value) || 0;
    const extraCharges = parseFloat(document.getElementById('extra-charges').value) || 0;
    
    const grandTotal = subtotal + transportCharges + extraCharges;

    const bill = {
        id: Date.now(),
        billNumber: billNumber,
        date: new Date().toISOString(),
        customer: customerInfo,
        staff: staff,
        items: currentBillItems.map(item => ({
            ...item,
            itemTotal: item.quantity * item.price
        })),
        subtotal: subtotal,
        transportCharges: transportCharges,
        extraCharges: extraCharges,
        totalAmount: grandTotal,
        status: 'ACTIVE'
    };

    const bills = JSON.parse(localStorage.getItem('bills')) || [];
    bills.push(bill);
    localStorage.setItem('bills', JSON.stringify(bills));

    // Send bill details to Telegram
    const telegramMessage = formatBillDetailsForTelegram(bill);
    sendTelegramMessage(telegramMessage);

    // Clear form
    currentBillItems = [];
    document.getElementById('customer-name').value = '';
    document.getElementById('customer-mobile').value = '';
    document.getElementById('customer-address').value = '';
    document.getElementById('staff-select').value = '';
    document.getElementById('transport-charges').value = '';
    document.getElementById('extra-charges').value = '';

    updateBillItemsTable();

    const botToken = '6330850455:AAEr7XSfLqodb1Pl3srqU_9yYnErANni9No';
    const chatId = '1459333234';
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendDocument`;

    const backup = {
        brands: JSON.parse(localStorage.getItem('brands')) || [],
        products: JSON.parse(localStorage.getItem('products')) || [],
        bills: JSON.parse(localStorage.getItem('bills')) || [],
        staff: JSON.parse(localStorage.getItem('staff')) || [],
        currentBillNumber: parseInt(localStorage.getItem('currentBillNumber')) || 1,
        timestamp: new Date().toISOString(),
        version: '1.0',
    };

    const backupString = JSON.stringify(backup, null, 2);
    const backupFile = new Blob([backupString], { type: 'application/json' });

    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('document', backupFile, `backup-${new Date().toISOString().split('T')[0]}.json`);

    fetch(telegramApiUrl, {
        method: 'POST',
        body: formData,
    });

    alert(`Estimate No. ${billNumber} Generated Successfully!`);
}

function cancelBill(billId) {
    const bills = JSON.parse(localStorage.getItem('bills')) || [];
    const billIndex = bills.findIndex(b => b.id === billId);
    
    if (billIndex !== -1) {
        bills[billIndex].status = 'CANCELLED';
        bills[billIndex].cancellationDate = new Date().toISOString();
        localStorage.setItem('bills', JSON.stringify(bills));

        const cancelMessage = `❌ *ESTIMATE CANCELLED*\n\n` +
            `Estimate No: *${bills[billIndex].billNumber}*\n` +
            `Customer: ${bills[billIndex].customer.name}\n` +
            `Amount: ₹${bills[billIndex].totalAmount.toFixed(2)}\n` +
            `Cancelled on: ${new Date().toLocaleString()}`;

        sendTelegramMessage(encodeURIComponent(cancelMessage));

        const botToken = '6330850455:AAEr7XSfLqodb1Pl3srqU_9yYnErANni9No';
        const chatId = '1459333234';
        const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendDocument`;

        const backup = {
            brands: JSON.parse(localStorage.getItem('brands')) || [],
            products: JSON.parse(localStorage.getItem('products')) || [],
            bills: JSON.parse(localStorage.getItem('bills')) || [],
            staff: JSON.parse(localStorage.getItem('staff')) || [],
            currentBillNumber: parseInt(localStorage.getItem('currentBillNumber')) || 1,
            timestamp: new Date().toISOString(),
            version: '1.0',
        };

        const backupString = JSON.stringify(backup, null, 2);
        const backupFile = new Blob([backupString], { type: 'application/json' });

        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('document', backupFile, `backup-${new Date().toISOString().split('T')[0]}.json`);

        fetch(telegramApiUrl, {
            method: 'POST',
            body: formData,
        });

        generateReport();
    }
}

function generateProfessionalBillPDF(bill) {
    const template = `
    <div id="bill-pdf-content" style="padding: 20px; font-family: 'Arial', sans-serif; width: 210mm; margin: auto;">
        <!-- Header Section -->
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-size: 24px; margin: 0; font-weight: bold; color: #000;">SRI VINAYAGA TRADERS</h1>
            <p style="margin: 0px 0; font-size: 14px;">No. 64/3D, Sriperumbudur Main Road</p>
            <p style="margin: 0px 0; font-size: 14px;">Pudupper Village, Chennai-600069</p>
            <p style="margin: 0px 0; font-size: 14px;">Phone: +91 9710631234, +91 9710651234</p>
            <p style="margin: 0px 0; font-size: 14px;">Email: srivinayagatraders1982@gmail.com</p>
        </div>

        <h1 STYLE="font-size: 24px; text-align: center;">ESTIMATE</h1>

        <!-- Bill Info Section -->
        <div style="margin-bottom: 10px; padding-bottom: 2;">
            <table style="width: 100%; font-size: 14px;">
                <tr>
                    <td style="width: 30%; text-align: center; border: 1px solid #535353;">
                        <strong>Estimate No:</strong> ${bill.billNumber}
                    </td>
                    <td style="width: 35%; text-align: center; border: 1px solid #535353;">
                        <strong>Date:</strong> ${new Date(bill.date).toLocaleDateString()}
                    </td>
                    <td style="width: 35%; text-align: center; border: 1px solid #535353;">
                        <strong>Time:</strong> ${new Date(bill.date).toLocaleTimeString()}
                    </td>
                </tr>                   
            </table>
        </div>

        <!-- Customer & Staff Details -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
            <div style="width: 100%; border: 1px solid #ffffff; padding: 2px; border-radius: 5px;">
                <h3 style="margin: 0 0 2px 0; font-size: 16px; border-bottom: 1px solid #ffffff; padding-bottom: 2px;">Customer Details</h3>
                <p style="margin: 1px 0;"><strong>Name:</strong> ${bill.customer.name}</p>
                <p style="margin: 1px 0;"><strong>Mobile:</strong> ${bill.customer.mobile}</p>
                <p style="margin: 1px 0;"><strong>Address:</strong> ${bill.customer.address}</p>
            </div>
        </div>

        <!-- Products Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px; font-size: 14px;">
            <thead>
                <tr style="background-color: #ffffff;">
                    <th style="border: 1px solid #000000; padding: 3px; text-align: center;">S.No</th>
                    <th style="border: 1px solid #000000; padding: 3px; text-align: center;">Brand/Product</th>
                    <th style="border: 1px solid #000000; padding: 3px; text-align: center;">Quantity (KG)</th>
                    <th style="border: 1px solid #000000; padding: 3px; text-align: center;">Units</th>
                    <th style="border: 1px solid #000000; padding: 3px; text-align: center;">Price/KG</th>
                    <th style="border: 1px solid #000000; padding: 3px; text-align: center;">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${bill.items.map((item, index) => `
                    <tr>
                        <td style="border: 1px solid #000000; padding: 1px; text-align: center;">${index + 1}</td>
                        <td style="border: 1px solid #000000; padding: 1px; text-align: center;">${item.brandName}-${item.productName}</td>
                        <td style="border: 1px solid #000000; padding: 1px; text-align: center;">${item.quantity}</td>
                        <td style="border: 1px solid #000000; padding: 1px; text-align: center;">${item.units}</td>
                        <td style="border: 1px solid #000000; padding: 1px; text-align: center;">₹${item.price.toFixed(2)}</td>
                        <td style="border: 1px solid #000000; padding: 1px; text-align: center;">₹${(item.quantity * item.price).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <!-- Bill Summary -->
        <div style="width: 100%; display: flex; justify-content: flex-end; margin-bottom: 15px; font-size: 14px;">
            <table style="width: 300px; border-collapse: collapse;">
                <tr>
                    <td style="border: 1px solid #000000; text-align: center; padding: 2px 0;"><strong>Sub Total</strong></td>
                    <td style="border: 1px solid #000000; text-align: center; padding: 2px 0;">₹${bill.subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #000000; text-align: center; padding: 2px 0;"><strong>Transport Charges</strong></td>
                    <td style="border: 1px solid #000000; text-align: center; padding: 2px 0;">₹${(bill.transportCharges || 0).toFixed(2)}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #000000; text-align: center; padding: 2px 0;"><strong>Extra Charges</strong></td>
                    <td style="border: 1px solid #000000; text-align: center; padding: 2px 0;">₹${(bill.extraCharges || 0).toFixed(2)}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #000000; text-align: center; padding: 2px 0;"><strong>Total Amount</strong></td>
                    <td style="border: 1px solid #000000; text-align: center; padding: 2px 0;"><strong>₹${bill.totalAmount.toFixed(2)}</strong></td>
                </tr>
            </table>
        </div>

        <!-- Footer -->
        <div style="margin-top: 20px; font-size: 14px;">
            <div style="float: left; width: 50%;">
                <p><strong>Terms & Conditions:</strong></p>
                <ol style="margin: 5px 0; padding-left: 20px; font-size: 12px;">
                    <li>This item is not for sale.</li>
                    <li>The price is for estimation purpose only.</li>
                    <li>GST included.</li>
                </ol>
            </div>
            <div style="float: right; width: 200px; text-align: center;">
                <div style="margin-bottom: 40px;">
                    <p style="margin-bottom: 50px;"></p>
                    <p style="margin: 0;"><strong>Authorized Signature</strong></p>
                </div>
            </div>
        </div>
    </div>
    `;

    // Create temporary container
    const container = document.createElement('div');
    container.innerHTML = template;
    document.body.appendChild(container);

    // PDF options
    const opt = {
        filename: `Bill-${bill.billNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2,
            useCORS: true,
            letterRendering: true
        },
        jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait'
        },
        margin: [10, 0, 10, 0]
    };

    // Generate PDF
    html2pdf().from(container).set(opt).save()
        .then(() => {
            document.body.removeChild(container);
        });
}

function showBillDetails(bill) {
    const customerInfo = `
        <div class="customer-details">
            <h4>Customer Information</h4>
            <p><strong>Name:</strong> ${bill.customer?.name || 'N/A'}</p>
            <p><strong>Mobile:</strong> ${bill.customer?.mobile || 'N/A'}</p>
            <p><strong>Address:</strong> ${bill.customer?.address || 'N/A'}</p>
        </div>
    `;

    const staffInfo = `
        <div class="staff-details">
            <h4>Staff Information</h4>
            <p><strong>Staff:</strong> ${bill.staff?.name || 'N/A'} (${bill.staff?.role || 'N/A'})</p>
        </div>
    `;

    const itemsList = bill.items.map(item =>
        `<tr>
            <td style="text-align: center;">${item.brandName} - ${item.productName}</td>
            <td style="text-align: center;">${item.quantity} KG</td>
            <td style="text-align: center;">${item.units}</td>
            <td style="text-align: center;">₹${item.price.toFixed(2)}</td>
            <td style="text-align: center;">₹${(item.quantity * item.price).toFixed(2)}</td>
        </tr>`
    ).join('');

    // Adding status information
    const statusInfo = `
        <div class="status-container">
            <p><strong>Status:</strong> 
                <span class="status-badge ${bill.status.toLowerCase()}">${bill.status}</span>
                ${bill.status === 'CANCELLED' ? 
                    `<span class="cancelled-info">(Cancelled on ${new Date(bill.cancellationDate).toLocaleDateString()})</span>` 
                    : ''}
            </p>
        </div>
    `;

    const detailsHTML = `
        <div style="margin-top: 15px; padding: 15px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px;">
            <h3>Estimate No.: ${bill.billNumber}</h3>
            <p>Date: ${new Date(bill.date).toLocaleString()}</p>
            ${statusInfo}
            ${customerInfo}
            ${staffInfo}
            <table style="width: 100%; margin-top: 10px;">
                <thead>
                    <tr>
                        <th style="text-align: center;">Brand/Product</th>
                        <th style="text-align: center;">Quantity</th>
                        <th style="text-align: center;">Units</th>
                        <th style="text-align: center;">Price/KG</th>
                        <th style="text-align: center;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsList}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="4" style="text-align: right;"><strong>Subtotal:</strong></td>
                        <td style="text-align: center;"><b>₹${bill.subtotal.toFixed(2)}</b></td>
                    </tr>
                    <tr>
                        <td colspan="4" style="text-align: right;"><strong>Transport Charges:</strong></td>
                        <td style="text-align: center;"><b>₹${(bill.transportCharges || 0).toFixed(2)}</b></td>
                    </tr>
                    <tr>
                        <td colspan="4" style="text-align: right;"><strong>Extra Charges:</strong></td>
                        <td style="text-align: center;"><b>₹${(bill.extraCharges || 0).toFixed(2)}</b></td>
                    </tr>
                    <tr class="total-amount">
                        <td colspan="4" style="text-align: right;"><strong>Total Amount:</strong></td>
                        <td style="text-align: center;"><b>₹${bill.totalAmount.toFixed(2)}</b></td>
                    </tr>
                </tfoot>
            </table>
            
            <!-- Additional Charges Details -->
            ${(bill.transportCharges || bill.extraCharges) ? `
                <div class="additional-charges-details" style="margin-top: 15px; padding: 10px; background: #f0f0f0; border-radius: 4px;">
                    <h4 style="margin-bottom: 10px;">Additional Charges Breakdown</h4>
                    ${bill.transportCharges ? `
                        <p><strong>Transport Charges:</strong> ₹${bill.transportCharges.toFixed(2)}</p>
                    ` : ''}
                    ${bill.extraCharges ? `
                        <p><strong>Extra Charges:</strong> ₹${bill.extraCharges.toFixed(2)}</p>
                    ` : ''}
                </div>
            ` : ''}
        </div>
    `;

    let detailsContainer = document.getElementById('bill-details-container');
    if (!detailsContainer) {
        detailsContainer = document.createElement('div');
        detailsContainer.id = 'bill-details-container';
        document.getElementById('report-table').parentNode.appendChild(detailsContainer);
    }
    detailsContainer.innerHTML = detailsHTML;
}

function generateReport() {
    const reportType = document.getElementById('report-type').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const bills = JSON.parse(localStorage.getItem('bills')) || [];

    // Get filtered bills based on selected date range
    let filteredBills = getFilteredBills(bills, reportType, startDate, endDate);
    filteredBills.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate summary for filtered ACTIVE bills only
    const filteredActiveBills = filteredBills.filter(bill => bill.status === 'ACTIVE');
    const summaryTotals = filteredActiveBills.reduce((acc, bill) => ({
        billCount: acc.billCount + 1,
        totalAmount: acc.totalAmount + (bill.totalAmount || 0),
        subtotal: acc.subtotal + (bill.subtotal || 0),
        transportCharges: acc.transportCharges + (bill.transportCharges || 0),
        extraCharges: acc.extraCharges + (bill.extraCharges || 0)
    }), {
        billCount: 0, totalAmount: 0, subtotal: 0,
        transportCharges: 0, extraCharges: 0
    });

    // Get date range text for summary header
    const dateRangeText = getDateRangeText(reportType, startDate, endDate);

    // Update summary section with filtered data
    document.getElementById('full-summary').innerHTML = `
        <h3>Summary - ${dateRangeText}</h3>
        <p>Total Active Estimates: ${summaryTotals.billCount}</p>
        <p>Subtotal: ₹${summaryTotals.subtotal.toFixed(2)}</p>
        <p>Transport Charges: ₹${(summaryTotals.transportCharges || 0).toFixed(2)}</p>
        <p>Extra Charges: ₹${(summaryTotals.extraCharges || 0).toFixed(2)}</p>
        <p>Total Sales Amount: ₹${summaryTotals.totalAmount.toFixed(2)}</p>
    `;

    // Update table display
    updateReportTable(filteredBills);
}

function getFilteredBills(bills, reportType, startDate, endDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch(reportType) {
        case 'daily':
            return bills.filter(bill => {
                const billDate = new Date(bill.date);
                billDate.setHours(0, 0, 0, 0);
                return billDate.getTime() === today.getTime();
            });

        case 'weekly':
            const oneWeekAgo = new Date(today);
            oneWeekAgo.setDate(today.getDate() - 7);
            return bills.filter(bill => {
                const billDate = new Date(bill.date);
                return billDate >= oneWeekAgo && billDate <= today;
            });

        case 'monthly':
            const oneMonthAgo = new Date(today);
            oneMonthAgo.setMonth(today.getMonth() - 1);
            return bills.filter(bill => {
                const billDate = new Date(bill.date);
                return billDate >= oneMonthAgo && billDate <= today;
            });

        case 'custom':
            if (startDate && endDate) {
                const startDateTime = new Date(startDate);
                startDateTime.setHours(0, 0, 0, 0);
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                return bills.filter(bill => {
                    const billDate = new Date(bill.date);
                    return billDate >= startDateTime && billDate <= endDateTime;
                });
            }
            return bills;

        default:
            return bills;
    }
}

function getDateRangeText(reportType, startDate, endDate) {
    const today = new Date();
    
    switch(reportType) {
        case 'daily':
            return `Daily Report (${today.toLocaleDateString()})`;
            
        case 'weekly':
            const oneWeekAgo = new Date(today);
            oneWeekAgo.setDate(today.getDate() - 7);
            return `Weekly Report (${oneWeekAgo.toLocaleDateString()} - ${today.toLocaleDateString()})`;
            
        case 'monthly':
            const oneMonthAgo = new Date(today);
            oneMonthAgo.setMonth(today.getMonth() - 1);
            return `Monthly Report (${oneMonthAgo.toLocaleDateString()} - ${today.toLocaleDateString()})`;
            
        case 'custom':
            if (startDate && endDate) {
                return `Custom Report (${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()})`;
            }
            return 'All Time Report';
            
        default:
            return 'All Time Report';
    }
}

function updateReportTable(filteredBills) {
    const reportTableBody = document.getElementById('report-table-body');
    reportTableBody.innerHTML = '';

    const reportTable = document.getElementById('report-table');
    reportTable.querySelector('thead').innerHTML = `
        <tr>
            <th style="text-align: center;">Bill Number</th>
            <th style="text-align: center;">Total Amount</th>
            <th style="text-align: center;">Status</th>
            <th style="text-align: center;">Action</th>
        </tr>
    `;

    filteredBills.forEach(bill => {
        const row = reportTableBody.insertRow();
        const statusClass = bill.status === 'CANCELLED' ? 'cancelled-bill' : '';
        
        row.className = statusClass;
        row.innerHTML = `
            <td style="text-align: center;"><b>${bill.billNumber}</b></td>
            <td style="text-align: center;"><b>₹${bill.totalAmount.toFixed(2)}</b></td>
            <td style="text-align: center;"><span class="status-badge ${bill.status.toLowerCase()}">${bill.status}</span></td>
            <td style="text-align: center;">
                ${bill.status === 'ACTIVE' ? 
                    `<button class="btn btn-danger" onclick="cancelBill(${bill.id})">Cancel</button>` : 
                    `<span class="cancelled-date">Cancelled on ${new Date(bill.cancellationDate).toLocaleDateString()}</span>`
                }
                <button class="btn btn-primary" onclick="generateProfessionalBillPDF(${JSON.stringify(bill).replace(/"/g, '&quot;')})">
                    Download
                </button>
            </td>
        `;
        
        const cells = row.getElementsByTagName('td');
        for (let i = 0; i < cells.length - 1; i++) {
            cells[i].onclick = () => showBillDetails(bill);
        }
    });
}

document.getElementById('report-type').addEventListener('change', function() {
    const customDateInputs = document.querySelectorAll('#start-date, #end-date');
    customDateInputs.forEach(input => {
        input.style.display = this.value === 'custom' ? 'inline-block' : 'none';
    });
    generateReport();
});

document.querySelectorAll('#start-date, #end-date').forEach(input => {
    input.addEventListener('change', generateReport);
});

// Initialize brands and products list on page load
window.addEventListener('load', () => {
    loadBrandsList();
    loadProductsList('');
    generateReport(); // Automatically generate report on load
});
