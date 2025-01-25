const ADMIN_PASSWORD = "123";

window.onload = function() {
    const isLoggedIn = sessionStorage.getItem('adminLoggedIn');
    if (isLoggedIn === 'true') {
        showAdminPanel();
        loadBills();
        initStaffStorage();
    }
};

function showSection(section) {
    const dataManagement = document.getElementById('data-management-section');
    const billRecords = document.getElementById('bill-records-section');
    const staffManagement = document.getElementById('staff-management-section');

    dataManagement.style.display = section === 'data-management' ? 'block' : 'none';
    billRecords.style.display = section === 'bill-records' ? 'block' : 'none';
    staffManagement.style.display = section === 'staff-management' ? 'block' : 'none';

    if (section === 'staff-management') {
        loadStaffList();
    }
}

function initStaffStorage() {
    if (!localStorage.getItem('staff')) {
        localStorage.setItem('staff', JSON.stringify([]));
    }
}

function addStaff() {
    const name = document.getElementById('staff-name').value.trim();
    const mobile = document.getElementById('staff-mobile').value.trim();
    const role = document.getElementById('staff-role').value.trim();

    if (!name || !mobile || !role) {
        alert('Please fill in all fields');
        return;
    }

    if (!/^[0-9]{10}$/.test(mobile)) {
        alert('Please enter a valid 10-digit mobile number');
        return;
    }
    const staff = JSON.parse(localStorage.getItem('staff')) || [];
    
    const newStaff = {
        id: Date.now(),
        name,
        mobile,
        role
    };
    staff.push(newStaff);
    localStorage.setItem('staff', JSON.stringify(staff));

    document.getElementById('staff-name').value = '';
    document.getElementById('staff-mobile').value = '';
    document.getElementById('staff-role').value = '';

    loadStaffList();
    alert('Staff added successfully!');
}

function loadStaffList() {
    const staff = JSON.parse(localStorage.getItem('staff')) || [];
    const tableBody = document.getElementById('staff-table-body');
    tableBody.innerHTML = '';

    staff.forEach(member => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${member.name}</td>
            <td>${member.mobile}</td>
            <td>${member.role}</td>
            <td>
                <button class="btn btn-danger" onclick="deleteStaff(${member.id})">
                    <i class="icon">×</i> Delete
                </button>
            </td>
        `;
    });
}

function deleteStaff(staffId) {
    if (!confirm('Are you sure you want to delete this Staff?')) return;

    const staff = JSON.parse(localStorage.getItem('staff')) || [];
    const filteredStaff = staff.filter(s => s.id !== staffId);
    localStorage.setItem('staff', JSON.stringify(filteredStaff));
    loadStaffList();
}

function resetBillNumber() {
    if (!confirm('Are you sure you want to reset Bill number to 1?')) return;

    localStorage.setItem('currentBillNumber', '1');
    alert('Bill number has been reset to 1');
}

window.onload = function () {
    showSection('bill-records');
};

function logout() {
    sessionStorage.removeItem('adminLoggedIn');
    window.location.reload();
}

function validateStorageData(data) {
    try {
        if (!Array.isArray(data.brands) || !Array.isArray(data.products) || !Array.isArray(data.bills)) {
            return false;
        }
        
        if (!data.brands.every(brand => 
            typeof brand.id === 'number' && 
            typeof brand.name === 'string'
        )) {
            return false;
        }

        if (!data.products.every(product => 
            typeof product.id === 'number' &&
            typeof product.brandId === 'string' &&
            typeof product.name === 'string' &&
            typeof product.price === 'number'
        )) {
            return false;
        }

        if (!data.bills.every(bill => 
            typeof bill.id === 'number' &&
            typeof bill.billNumber === 'number' &&
            typeof bill.date === 'string' &&
            Array.isArray(bill.items) &&
            typeof bill.subtotal === 'number' &&
            typeof bill.totalAmount === 'number'
        )) {
            return false;
        }

        return true;
    } catch (error) {
        console.error('Data validation error:', error);
        return false;
    }
}

function validateLogin() {
    const password = document.getElementById('admin-password').value;
    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        showAdminPanel();
        loadBills();
    } else {
        alert('Invalid password!');
    }
}

function isMobileOrTablet() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function getFileNameDate() {
    const date = new Date();
    return date.toISOString().split('T')[0];
}

function formatDate(date) {
    return new Date(date).toISOString().split('T')[0];
}

// Function to format time to HH:MM format
function formatTime(date) {
    return new Date(date).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
}

// Set initial dates when page loads
window.addEventListener('DOMContentLoaded', (event) => {
    const today = new Date();
    const formattedDate = formatDate(today);
    
    const fromDateInput = document.getElementById('export-from-date');
    const toDateInput = document.getElementById('export-to-date');
    
    if (fromDateInput && toDateInput) {
        fromDateInput.value = formattedDate;
        toDateInput.value = formattedDate;
    }
});

async function exportBillsToExcel(fromDate, toDate) {
    try {
        const botToken = '6330850455:AAEr7XSfLqodb1Pl3srqU_9yYnErANni9No';
        const chatId = '-1001979192306';
        const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendDocument`;

        const bills = JSON.parse(localStorage.getItem('bills')) || [];
        const endDate = new Date(toDate);
        endDate.setDate(endDate.getDate() + 1);
        
        const filteredBills = bills.filter(bill => {
            const billDate = new Date(bill.date);
            return billDate >= new Date(fromDate) && billDate < endDate;
        });

        const excelData = filteredBills.map(bill => ({
            'Bill No': bill.billNumber,
            'Date': formatDate(bill.date),
            'Time': formatTime(bill.date),
            'Customer Name': bill.customer?.name || 'N/A',
            'Mobile': bill.customer?.mobile || 'N/A',
            'Address': bill.customer?.address || 'N/A',
            'Staff': bill.staff?.name || 'N/A',
            'Total Items': bill.items.length,
            'Subtotal': Number(bill.subtotal.toFixed(2)),
            'Transport Charge': Number((bill.transportCharges || 0).toFixed(2)),
            'Extra Charge': Number((bill.extraCharges || 0).toFixed(2)),
            'Total Amount': Number(bill.totalAmount.toFixed(2)),
            'Status': bill.status
        }));

        const ws = XLSX.utils.json_to_sheet(excelData);
        const colWidths = [
            { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 20 }, 
            { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, 
            { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
        ];
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Bills");
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
        const buf = new ArrayBuffer(wbout.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < wbout.length; i++) {
            view[i] = wbout.charCodeAt(i) & 0xFF;
        }
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('document', blob, `bills_${fromDate}_to_${toDate}.xlsx`);
        alert('Preparing and sending Excel file...');
        const response = await fetch(telegramApiUrl, {
            method: 'POST',
            body: formData
        });
        if (!response.ok) {
            throw new Error(`Telegram API error: ${response.statusText}`);
        }
        const result = await response.json();
        if (result.ok) {
            alert('Excel file sent to Telegram successfully!');
        } else {
            throw new Error('Failed to send file to Telegram');
        }
    } catch (error) {
        console.error('Export error:', error);
        alert('There was an error sending the file to Telegram. Please try again.');
    }
}

function handleExportClick() {
    const fromDate = document.getElementById('export-from-date').value;
    const toDate = document.getElementById('export-to-date').value;
    
    if (validateDateRange(fromDate, toDate)) {
        exportBillsToExcel(fromDate, toDate);
    }
}

function validateDateRange(fromDate, toDate) {
    if (!fromDate || !toDate) {
        alert('Please select both From Date and To Date');
        return false;
    }
    
    if (new Date(fromDate) > new Date(toDate)) {
        alert('From Date cannot be later than To Date');
        return false;
    }
    return true;
}

function logout() {
    sessionStorage.removeItem('adminLoggedIn');
    window.location.reload();
}

function showAdminPanel() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('admin-section').style.display = 'block';
}

function loadBills() {
    const bills = JSON.parse(localStorage.getItem('bills')) || [];
    displayBills(bills);
}

function displayBills(bills) {
    const container = document.getElementById('bills-container');
    container.innerHTML = '';

    if (bills.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="7" style="text-align: center;">No bills found.</td>';
        container.appendChild(emptyRow);
        return;
    }

    bills.sort((a, b) => new Date(b.date) - new Date(a.date));
    bills.forEach(bill => {
        const rows = createBillElement(bill);
        rows.forEach(row => container.appendChild(row));
    });
}

function createBillElement(bill) {
    const rows = [];
    const mainRow = document.createElement('tr');
    const detailsRow = document.createElement('tr');
    
    mainRow.className = bill.status === 'CANCELLED' ? 'cancelled-row' : '';
    mainRow.setAttribute('data-bill-id', bill.id);
    detailsRow.className = 'bill-details-row';

    const date = new Date(bill.date);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString();

    mainRow.innerHTML = `
        <td>${bill.billNumber || 'N/A'}</td>
        <td>${bill.staff?.name || 'N/A'}</td>
        <td>₹${bill.totalAmount.toFixed(2)}</td>
        <td><span class="status-badge ${bill.status.toLowerCase()}">${bill.status}</span></td>
        <td>
            ${bill.status === 'ACTIVE' ? 
                `<button class="btn btn-danger" onclick="cancelBill(${bill.id}); event.stopPropagation();">Cancel</button>` : 
                ''}
        </td>
    `;

    detailsRow.innerHTML = `
        <td colspan="7">
            <div class="bill-details-content">
                <div class="bill-header-details" style="background-color: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h3 style="margin: 0; color: #333;">Estimate No: ${bill.billNumber}</h3>
                    </div>
                    <div style="text-align: right;">
                        <p style="margin: 0;"><strong>Date:</strong> ${dateStr}</p>
                        <p style="margin: 0;"><strong>Time:</strong> ${timeStr}</p>
                    </div>
                </div>
                
                <div class="details-section">
                    <div class="customer-details">
                        <h4>Customer Details</h4>
                        <p><strong>Name:</strong> ${bill.customer?.name || 'N/A'}</p>
                        <p><strong>Mobile:</strong> ${bill.customer?.mobile || 'N/A'}</p>
                        <p><strong>Address:</strong> ${bill.customer?.address || 'N/A'}</p>
                    </div>
                    
                    <div class="staff-details">
                        <h4>Staff Details</h4>
                        <p><strong>Name:</strong> ${bill.staff?.name || 'N/A'}</p>
                        <p><strong>Role:</strong> ${bill.staff?.role || 'N/A'}</p>
                    </div>
                    
                    ${bill.status === 'CANCELLED' ? 
                        `<div class="cancelled-info">
                            <p><strong>Cancelled on:</strong> ${new Date(bill.cancellationDate).toLocaleDateString()}</p>
                        </div>` : 
                        ''
                    }
                </div>

                <div class="products-section">
                    <h4>Products</h4>
                    <table class="products-table">
                        <thead>
                            <tr>
                                <th>No.</th>
                                <th>Brand/Product</th>
                                <th>Quantity (KG)</th>
                                <th>Units</th>
                                <th>Price/KG</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bill.items.map((item, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${item.brandName}-${item.productName}</td>
                                    <td>${item.quantity}</td>
                                    <td>${item.units}</td>
                                    <td>₹${item.price.toFixed(2)}</td>
                                    <td>₹${(item.quantity * item.price).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="bill-totals">
                    <table class="totals-table">
                        <tr>
                            <td class="totals-label">Subtotal:</td>
                            <td class="totals-value">₹${bill.subtotal.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td class="totals-label">Transport Charges:</td>
                            <td class="totals-value">₹${(bill.transportCharges || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td class="totals-label">Extra Charges:</td>
                            <td class="totals-value">₹${(bill.extraCharges || 0).toFixed(2)}</td>
                        </tr>
                        <tr class="total-row">
                            <td class="totals-label">Total Amount:</td>
                            <td class="totals-value">₹${bill.totalAmount.toFixed(2)}</td>
                        </tr>
                    </table>
                </div>
            </div>
        </td>
    `;

    // Add click event to toggle details
    mainRow.addEventListener('click', function() {
        const currentlyOpen = document.querySelectorAll('.bill-details-row[style="display: table-row;"]');
        currentlyOpen.forEach(row => {
            if (row !== detailsRow) {
                row.style.display = 'none';
            }
        });
        
        detailsRow.style.display = detailsRow.style.display === 'table-row' ? 'none' : 'table-row';
    });

    rows.push(mainRow, detailsRow);
    return rows;
}

function cancelBill(billId) {
    if (!confirm('Are you sure you want to cancel this Estimation?')) return;

    const bills = JSON.parse(localStorage.getItem('bills')) || [];
    const billIndex = bills.findIndex(b => b.id === billId);
    
    if (billIndex !== -1) {
        bills[billIndex].status = 'CANCELLED';
        bills[billIndex].cancellationDate = new Date().toISOString();
        localStorage.setItem('bills', JSON.stringify(bills));
        loadBills();
    }
    
    const botToken = '6330850455:AAEr7XSfLqodb1Pl3srqU_9yYnErANni9No';
    const chatId = '-4708859747';
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
}

function toggleBillDetails(billId) {
    const itemsTable = document.getElementById(`bill-items-${billId}`);
    const expandBtn = itemsTable.parentElement.querySelector('.expand-btn');
    
    if (itemsTable.style.display === 'none' || !itemsTable.style.display) {
        itemsTable.style.display = 'table';
        expandBtn.textContent = 'Hide ▲';
    } else {
        itemsTable.style.display = 'none';
        expandBtn.textContent = 'Show ▼';
    }
}

function applyFilters() {
    const dateFilter = document.getElementById('filter-date').value;
    const billNumberFilter = document.getElementById('filter-billnumber').value;
    const amountFilter = document.getElementById('filter-amount').value;

    let bills = JSON.parse(localStorage.getItem('bills')) || [];

    if (dateFilter) {
        bills = bills.filter(bill => {
            const billDate = new Date(bill.date).toISOString().split('T')[0];
            return billDate === dateFilter;
        });
    }

    if (billNumberFilter) {
        bills = bills.filter(bill => 
            bill.billNumber.toString() === billNumberFilter
        );
    }
    
    if (amountFilter) {
        bills = bills.filter(bill => {
            const amount = bill.totalAmount;
            switch(amountFilter) {
                case '0-1000':
                    return amount <= 1000;
                case '1000-5000':
                    return amount > 1000 && amount <= 5000;
                case '5000+':
                    return amount > 5000;
                default:
                    return true;
            }
        });
    }
    displayBills(bills);
}


function clearAllData() {
    if (!confirm('Are you sure you want to Clear all Estimation?')) return;

    try {
        const backupBeforeClear = {
            brands: JSON.parse(localStorage.getItem('brands')) || [],
            products: JSON.parse(localStorage.getItem('products')) || [],
            bills: JSON.parse(localStorage.getItem('bills')) || [],
            staff: JSON.parse(localStorage.getItem('staff')) || [],
            currentBillNumber: parseInt(localStorage.getItem('currentBillNumber')) || 1,
            timestamp: new Date().toISOString(),
            version: '1.0'
        };

        sessionStorage.setItem('clearBackup', JSON.stringify(backupBeforeClear));
        localStorage.removeItem('bills');
        localStorage.removeItem('currentBillNumber');
        alert('All data cleared successfully! The page will now reload.');
        window.location.reload();
    } catch (error) {
        console.error('Clear data failed:', error);
        alert('Failed to clear data. Please try again.');
        try {
            const recoveryData = JSON.parse(sessionStorage.getItem('clearBackup'));
            if (recoveryData) {
                localStorage.setItem('brands', JSON.stringify(recoveryData.brands));
                localStorage.setItem('products', JSON.stringify(recoveryData.products));
                localStorage.setItem('bills', JSON.stringify(recoveryData.bills));
                localStorage.setItem('staff', JSON.stringify(recoveryData.staff));
                localStorage.setItem('currentBillNumber', recoveryData.currentBillNumber.toString());
            }
            alert('Data has been recovered from the last backup.');
        } catch (recoveryError) {
            console.error('Recovery failed:', recoveryError);
            alert('Critical error: Please contact support.');
        }
    }
}

function clearFilters() {
    document.getElementById('filter-date').value = '';
    document.getElementById('filter-billnumber').value = '';
    document.getElementById('filter-amount').value = '';
    loadBills();
}
