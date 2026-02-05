// Auth Check
if (!localStorage.getItem("token") || !localStorage.getItem("isLoggedIn")) {
  window.location.href = "login.html";
}

// --- Data Seeding & Management ---

const MOCK_DATA = {
  user: {
    name: "Alex Morgan",
    email: "alex.morgan@LogiSir.com",
    role: "Admin",
    avatar: "https://ui-avatars.com/api/?name=Alex+Morgan&background=0D8ABC&color=fff",
    notifications: { email: true, sms: false },
    kycStatus: "Incomplete"
  },
  wallet: {
    balance: 0.00,
    spendingLimit: 200000,
    transactions: [] 
  },
  customers: [],
  orders: [],
  shipments: [],
  dashboardCharts: {
    shipmentStats: [0, 0, 0, 0, 0, 0, 0], 
    ordersByCity: {
        labels: ["Mumbai", "Delhi", "Bangalore", "Chennai", "Pune"],
        data: [0, 0, 0, 0, 0]
    },
    vehicleStatus: [0, 0, 0], 
    avgDeliveryTime: [0, 0, 0, 0, 0, 0] 
  },
  fleet: {
    vehicles: [],
    drivers: [],
    fuelLogs: [0, 0, 0, 0, 0, 0], 
    expenses: [0, 0, 0, 0, 0, 0], 
    maintenanceAlerts: []
  },
  inventory: {
    warehouses: [],
    items: [],
    stats: {
        inbound: 0,
        outbound: 0,
        lowStock: 0
    },
    charts: {
        turnover: [0, 0, 0, 0, 0, 0], 
        demand: [0, 0, 0, 0, 0, 0], 
        shrinkage: [0, 0, 0, 0], 
        cost: [0, 0, 0, 0] 
    }
  },
  income: {
      stats: {
          itemsSold: 0,
          downloads: 0,
          documents: 0,
          newOrders: 0,
          products: 0,
          invoices: 0
      },
      charts: {
          salesMonth: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 
          revenue: [0, 0, 0, 0, 0, 0], 
          leads: [0, 0, 0, 0, 0, 0, 0], 
          income: [0, 0, 0, 0, 0, 0, 0], 
          channels: [0, 0, 0, 0] 
      },
      transactions: []
  },
  reports: {
      stats: {
          products: 0,
          orders: 0,
          customers: 0,
          reviews: 0
      },
      yearlySales: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      summary: {
          totalOrders: 0,
          totalSales: 0,
          totalProfit: 0,
          totalRevenue: 0
      },
      history: [],
      notifications: [],
      invoices: []
  },
  invoicesList: []
};

async function fetchShipments() {
  const token = localStorage.getItem('token');
  if (!token) return [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      
    const response = await fetch('/api/shipments', { 
      headers: { 'x-auth-token': token },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (response.ok) {
      return await response.json();
    }
    return [];
  } catch (err) {
    console.error('Backend fetch failed:', err);
    return [];
  }
}

function getData() {
  // FORCE RESET LOGIC: 
  // We want to ensure the zeroed MOCK_DATA is used. 
  // We'll define a version key. If it doesn't match, we wipe the old data.
  const DATA_VERSION = "v_zero_1"; 
  const currentVersion = localStorage.getItem("LogiSir_Data_Version");

  if (currentVersion !== DATA_VERSION) {
      console.log("Dashboard: Old data detected. Resetting to zero state.");
      localStorage.removeItem("LogiSir_data");
      localStorage.setItem("LogiSir_Data_Version", DATA_VERSION);
  }

  const data = JSON.parse(localStorage.getItem("LogiSir_data")) || { ...MOCK_DATA };
  
  // Sync user info from auth if available
  const authUser = JSON.parse(localStorage.getItem("user"));
  if (authUser) {
    data.user.name = `${authUser.firstName} ${authUser.lastName}`;
    data.user.email = authUser.email;
  }
  return data;
}

function saveData(data) {
  localStorage.setItem("LogiSir_data", JSON.stringify(data));
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

// --- Rendering Logic ---

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Setup Interactivity FIRST (Critical)
    console.log("Dashboard: DOMContentLoaded");
    try {
        setupSidebar();
        console.log("Dashboard: Sidebar setup complete");
    } catch (e) {
        console.error("Dashboard: Sidebar setup failed", e);
    }

    try {
        setupLogout();
        console.log("Dashboard: Logout setup complete");
    } catch (e) {
        console.error("Dashboard: Logout setup failed", e);
    }

    // 2. Load Data & Render
    try {
        const data = getData();
        console.log("Dashboard: Data loaded locally");
        
        // Fetch shipments async - don't block UI if this fails or hangs
        // Fetch shipments async - with graceful fallback
        fetchShipments().then(shipments => {
            if(shipments && shipments.length > 0) {
                data.shipments = shipments;
                // If we got new data from server, we might want to re-render specific sections
                // For this "No Backend" implementation, we often rely on local MOCK_DATA which is already in `data`
                // But if server is alive, we override.
                renderGlobal(data); 
                // Re-render current page if needed
                const page = window.location.pathname.split("/").pop();
                if (page === "dashboard.html" || page === "") renderDashboardHome(data);
                if (page === "shipments.html") renderShipmentsPage(data);
            }
        }).catch(err => {
            console.log("Background fetch failed, using local/mock data:", err);
            // No action needed, data already contains MOCK_DATA reference or local storage logic
        });

        // Note: We are removing the top-level await here to prevent blocking event listeners if fetch hangs.
        // Instead, we use the local data immediately.
        
        renderGlobal(data);
  
        if (document.querySelector(".dashboard-container")) {
            const page = window.location.pathname.split("/").pop();
            console.log("Dashboard: Rendering page", page);
            
            if (page === "dashboard.html" || page === "") renderDashboardHome(data);
            if (page === "shipments.html") renderShipmentsPage(data);
            if (page === "create-shipment.html") setupCreateShipmentPage(data);
            if (page === "add-customer.html") setupAddCustomerPage(data);
            if (page === "kyc.html") setupKYCPage(data);
            if (page === "customers.html") renderCustomersPage(data);
            if (page === "wallet.html") renderWalletPage(data);
            if (page === "analytics.html") renderAnalyticsPage(data);
            if (page === "settings.html") renderSettingsPage(data);
            if (page === "orders.html") renderOrdersPage(data);
            if (page === "fleet.html") renderFleetPage(data);
            if (page === "inventory.html") renderInventoryPage(data);
            if (page === "income.html") renderIncomePage(data);
            if (page === "invoices.html") renderInvoicesPage(data);
            if (page === "reports.html") renderReportsPage(data);
            if (page === "view-invoice.html") renderViewInvoicePage(data);
        }
    } catch (err) {
        console.error("Dashboard: Rendering failed", err);
    }
});


function renderGlobal(data) {
  // Update user profile in sidebar/header if elements exist
  const profileNameEls = document.querySelectorAll(".profile-info .text h4");
  const profileImgEls = document.querySelectorAll(".profile-info img");
  
  profileNameEls.forEach(el => el.textContent = data.user.name);
  profileImgEls.forEach(el => {
      // Use custom avatar if available, otherwise fallback
      if (data.user.avatar) {
          el.src = data.user.avatar;
      } else {
          el.src = `https://ui-avatars.com/api/?name=${data.user.name.replace(" ", "+")}&background=0D8ABC&color=fff`;
      }
  });
}

function renderDashboardHome(data) {
    if (!document.getElementById("statTotalShipments")) return;

    // 1. Update Stats
    const stats = {
        total: data.shipments.length,
        pending: data.shipments.filter(s => s.status === "Pending").length,
        delivered: data.shipments.filter(s => s.status === "Delivered").length,
        cancelled: data.shipments.filter(s => s.status === "Cancelled").length,
        inTransit: data.shipments.filter(s => s.status === "In Transit").length,
        returned: data.shipments.filter(s => s.status === "Returned").length,
        onHold: data.shipments.filter(s => s.status === "On Hold").length,
        failed: data.shipments.filter(s => s.status === "Failed").length
    };

    const setStat = (id, val) => { 
        const el = document.getElementById(id); 
        if(el) el.innerText = val; 
    };
    
    setStat("statTotalShipments", stats.total);
    setStat("statPending", stats.pending);
    setStat("statDelivered", stats.delivered);
    setStat("statCancelled", stats.cancelled);
    setStat("statInTransit", stats.inTransit);
    setStat("statReturned", stats.returned);
    setStat("statOnHold", stats.onHold);
    setStat("statFailed", stats.failed);

    // KYC Status Logic
    const kycStatus = data.user.kycStatus || "Incomplete"; 
    const kycBanner = document.getElementById("kycBanner");
    
    // Reset banner logic
    if(kycBanner) {
        if(kycStatus === "Incomplete") {
            kycBanner.classList.remove("hidden");
            kycBanner.querySelector("h4").innerText = "Complete Your KYC Verification";
            kycBanner.querySelector("p").innerText = "Verify your identity to unlock international shipping and higher limits.";
            kycBanner.querySelector("button").innerText = "Verify Now";
            kycBanner.querySelector("button").onclick = () => window.location.href='kyc.html';
        } else if (kycStatus === "Pending") {
            kycBanner.classList.remove("hidden");
            kycBanner.querySelector("h4").innerText = "KYC Verification Pending";
            kycBanner.querySelector("p").innerText = "Our team is reviewing your documents. This usually takes 24-48 hours.";
            // Demo Feature: Admin Verify
            kycBanner.querySelector("button").innerHTML = "Demo: Admin Verify <i class='fa-solid fa-check-double'></i>";
            kycBanner.querySelector("button").style.background = "#f59e0b";
            kycBanner.querySelector("button").onclick = () => {
                if(confirm("Demo: Approve KYC for this user?")) {
                    data.user.kycStatus = "Verified";
                    saveData(data);
                    alert("User Verified Successfully!");
                    location.reload();
                }
            };
            // Change banner color for pending
            kycBanner.style.background = "#fffbeb";
            kycBanner.style.borderColor = "#fcd34d"; 
        } else if (kycStatus === "Verified") {
            kycBanner.classList.add("hidden");
        }
    }

    // 2. Charts
    // Shipment Statistics (Line)
    if (document.getElementById("shipmentStatsChart")) {
        new Chart(document.getElementById("shipmentStatsChart"), {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Shipments',
                    data: data.dashboardCharts.shipmentStats || [0,0,0,0,0,0,0],
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }

    // Vehicle Status (Doughnut)
    if (document.getElementById("vehicleStatusChart")) {
        new Chart(document.getElementById("vehicleStatusChart"), {
            type: 'doughnut',
            data: {
                labels: ['Active', 'Idle', 'Maintenance'],
                datasets: [{
                    data: data.dashboardCharts.vehicleStatus || [1, 0, 0],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // Orders by City (Bar)
    if (document.getElementById("ordersCityChart")) {
        new Chart(document.getElementById("ordersCityChart"), {
            type: 'bar',
            data: {
                labels: data.dashboardCharts.ordersByCity?.labels || [],
                datasets: [{
                    label: 'Orders',
                    data: data.dashboardCharts.ordersByCity?.data || [],
                    backgroundColor: '#8b5cf6',
                    borderRadius: 4
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }

    // Avg Delivery Time (Line - Area)
    if (document.getElementById("avgDeliveryTimeChart")) {
        new Chart(document.getElementById("avgDeliveryTimeChart"), {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
                datasets: [{
                    label: 'Days',
                    data: data.dashboardCharts.avgDeliveryTime || [0,0,0,0,0,0],
                    borderColor: '#0ea5e9',
                    backgroundColor: 'rgba(14, 165, 233, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }

    // 3. Tables - Vehicle List
    const vehicleBody = document.querySelector("#vehicleListTable tbody");
    if (vehicleBody) {
        vehicleBody.innerHTML = "";
        // No data population - keep empty
        if (data.fleet && data.fleet.vehicles && data.fleet.vehicles.length > 0) {
           data.fleet.vehicles.forEach(v => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td style="font-weight: 500;">${v.id}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                             <i class="fa-solid ${v.typeIcon || 'fa-truck'}" style="color: #6b7280;"></i>
                             <span>${v.model}</span>
                        </div>
                    </td>
                    <td>${v.status}</td>
                    <td>${v.location || 'Unknown'}</td>
                    <td>${v.lastService || '-'}</td>
                    <td>${v.nextMaint || '-'}</td>
                    <td>
                        <div class="user-cell">
                            <img src="${v.driverImg || 'https://ui-avatars.com/api/?name=Driver'}" alt="">
                            ${v.driver}
                        </div>
                    </td>
                `;
                vehicleBody.appendChild(tr);
           });
        } else {
             vehicleBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#6b7280;">No active vehicles found</td></tr>`;
        }
    }

    // 4. Wallet (Reuse Logic)
    const walletBalEl = document.getElementById("walletBalance");
    if(walletBalEl) walletBalEl.textContent = formatCurrency(data.wallet.balance).replace("₹", "").trim();

    setupWalletInteractions(data);
}

// --- Shipment Page Logic (Filtering, Pagination, Export) ---
let currentState = {
    page: 1,
    itemsPerPage: 10,
    filters: {
        status: "",
        date: ""
    }
};

function renderShipmentsPage(data) {
   const tbody = document.querySelector("table tbody");
   if (!tbody) return;
   
   // Apply Filters
   let filtered = data.shipments.filter(s => {
       const statusMatch = !currentState.filters.status || s.status === currentState.filters.status;
       // Date match: simple string comparison YYYY-MM-DD
       const dateMatch = !currentState.filters.date || s.date.startsWith(currentState.filters.date);
       return statusMatch && dateMatch;
   });

   // Setup Interactions (only once)
   if(!document.getElementById("applyFiltersBtn").dataset.bound) {
       document.getElementById("applyFiltersBtn").addEventListener("click", () => {
           currentState.filters.status = document.getElementById("statusFilter").value;
           currentState.filters.date = document.getElementById("dateFilter").value;
           currentState.page = 1; // Reset to page 1
           renderShipmentsPage(data);
       });
       document.getElementById("applyFiltersBtn").dataset.bound = true;
   }

   if(!document.getElementById("exportBtn").dataset.bound) {
       document.getElementById("exportBtn").addEventListener("click", () => exportShipmentsPDF(filtered));
       document.getElementById("exportBtn").dataset.bound = true;
   }

   // Pagination
   const totalItems = filtered.length;
   const totalPages = Math.ceil(totalItems / currentState.itemsPerPage);
   const start = (currentState.page - 1) * currentState.itemsPerPage;
   const paginatedDocs = filtered.slice(start, start + currentState.itemsPerPage);

   // Render Table
   tbody.innerHTML = "";
   if(paginatedDocs.length === 0) {
       tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem;">No shipments found.</td></tr>`;
   } else {
       paginatedDocs.forEach(s => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${s.trackingId || s.id}</td>
            <td>
               <div class="user-cell">
                <img src="https://ui-avatars.com/api/?name=${s.customer.replace(" ", "+")}&background=random" alt="" />
                ${s.customer}
               </div>
            </td>
            <td>${s.origin}</td>
            <td>${s.destination}</td>
            <td>${new Date(s.date).toLocaleDateString('en-IN', {  month: 'short', day: 'numeric', year: 'numeric' })}</td>
            <td><span class="status ${getStatusClass(s.status)}">${s.status}</span></td>
            <td>${formatCurrency(s.amount)}</td>
            <td><button class="action-btn" onclick="alert('View Details for ${s.id}')"><i class="fa-solid fa-eye"></i></button></td>
          `;
          tbody.appendChild(tr);
       });
   }
   
   renderPagination(totalItems, totalPages, start, Math.min(start + currentState.itemsPerPage, totalItems), data);
}

function renderPagination(totalItems, totalPages, start, end, data) {
    const container = document.getElementById("paginationContainer");
    if(!container) return;
    
    container.innerHTML = `
        <span style="font-size:0.85rem; color:var(--text-secondary);">Showing ${totalItems === 0 ? 0 : start + 1}-${end} of ${totalItems} results</span>
        <div style="display:flex; gap:0.5rem;">
            <button id="prevBtn" ${currentState.page === 1 ? 'disabled' : ''} style="padding:0.5rem 1rem; border:1px solid var(--border-color); background:${currentState.page === 1 ? '#f3f4f6' : 'white'}; border-radius:0.25rem; cursor:pointer;">Previous</button>
            <button disabled style="padding:0.5rem 1rem; border:1px solid var(--primary-color); background:var(--primary-color); color:white; border-radius:0.25rem;">${currentState.page}</button>
            <button id="nextBtn" ${currentState.page >= totalPages ? 'disabled' : ''} style="padding:0.5rem 1rem; border:1px solid var(--border-color); background:${currentState.page >= totalPages ? '#f3f4f6' : 'white'}; border-radius:0.25rem; cursor:pointer;">Next</button>
        </div>
    `;
    
    document.getElementById("prevBtn").onclick = () => {
        if(currentState.page > 1) {
            currentState.page--;
            renderShipmentsPage(data);
        }
    };
    
    document.getElementById("nextBtn").onclick = () => {
        if(currentState.page < totalPages) {
            currentState.page++;
            renderShipmentsPage(data);
        }
    };
}

function exportShipmentsPDF(data) {
    // Check if libraries are loaded
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("PDF Library not loaded. Please refresh.");
        return;
    }

    const doc = new window.jspdf.jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229); // Primary Color
    doc.text("LogiSir - Shipment Report", 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Table Data
    const tableColumn = ["Tracking ID", "Customer", "Origin", "Destination", "Date", "Status", "Amount"];
    const tableRows = [];

    data.forEach(s => {
        const rowData = [
            s.id,
            s.customer,
            s.origin,
            s.destination,
            new Date(s.date).toLocaleDateString(),
            s.status,
            formatCurrency(s.amount)
        ];
        tableRows.push(rowData);
    });

    // Generate Table
    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] }, // Primary color
        styles: { fontSize: 9 }
    });
    
    doc.save(`shipments_report_${new Date().toISOString().slice(0,10)}.pdf`);
}

function exportWalletPDF(transactions) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("PDF Library not loaded. Please refresh.");
        return;
    }

    const doc = new window.jspdf.jsPDF();

    // Header
    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229); // Primary Color
    doc.text("LogiSir - Wallet Statement", 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    // Table Data
    const tableColumn = ["ID", "Date", "Description", "Method", "Type", "Amount", "Status"];
    const tableRows = [];

    transactions.forEach(t => {
        const rowData = [
            t.id,
            new Date(t.date).toLocaleDateString(),
            t.desc,
            t.method,
            t.type.toUpperCase(),
            formatCurrency(t.amount),
            t.status
        ];
        tableRows.push(rowData);
    });

    // Generate Table
    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 },
        columnStyles: {
            4: { textColor: [100, 100, 100] }, // Type
            5: { halign: 'right' } // Amount right-aligned
        }
    });

    doc.save(`wallet_statement_${new Date().toISOString().slice(0,10)}.pdf`);
}

function renderCustomersPage(data) {
    const grid = document.querySelector(".content-wrapper > div:nth-child(2)"); // Heuristic: Grid is the second main div
    // Better to have an ID, but let's try to find appropriate container.
    // In customers.html, the grid has style "display: grid; ..."
    const grids = document.querySelectorAll(".content-wrapper div");
    let container = null;
    grids.forEach(div => {
        if(div.style.display === "grid") container = div;
    });

    if(container) {
        container.innerHTML = "";
        data.customers.forEach(c => {
            const card = document.createElement("div");
            card.className = "stat-card";
            card.style.cssText = "flex-direction: column; gap: 0; padding:0; overflow:hidden;";
            
            // Random gradient
            const gradients = [
                "linear-gradient(135deg, #4f46e5, #818cf8)",
                "linear-gradient(135deg, #10b981, #34d399)",
                "linear-gradient(135deg, #f59e0b, #fbbf24)",
                "linear-gradient(135deg, #ec4899, #f472b6)"
            ];
            const bg = gradients[Math.floor(Math.random() * gradients.length)];

            card.innerHTML = `
                <div style="background: ${bg}; height: 80px; width: 100%;"></div>
                <div style="padding: 1.5rem; text-align: center; margin-top: -40px;">
                    <img src="https://ui-avatars.com/api/?name=${c.name.replace(" ", "+")}&background=random&size=128" style="width: 80px; height: 80px; border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" alt="">
                    <h3 style="margin-top: 0.5rem; font-size: 1.1rem; font-weight: 600;">${c.name}</h3>
                    <p style="color: var(--text-secondary); font-size: 0.85rem;">${c.email}</p>
                    
                    <div style="display: flex; justify-content: space-between; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color);">
                        <div>
                            <span style="display:block; font-size: 1.1rem; font-weight: 700;">${c.orders}</span>
                            <span style="font-size: 0.75rem; color: var(--text-secondary);">Orders</span>
                        </div>
                         <div>
                            <span style="display:block; font-size: 1.1rem; font-weight: 700;">${formatCurrency(c.spent)}</span>
                            <span style="font-size: 0.75rem; color: var(--text-secondary);">Spent</span>
                        </div>
                         <div>
                            <span style="display:block; font-size: 1.1rem; font-weight: 700; color: ${c.status === 'Active' ? 'var(--success-color)' : 'var(--text-secondary)'};">${c.status}</span>
                            <span style="font-size: 0.75rem; color: var(--text-secondary);">Status</span>
                        </div>
                    </div>
                     <button style="width: 100%; margin-top: 1rem; padding: 0.5rem; border: 1px solid var(--border-color); background: transparent; border-radius: 0.5rem; cursor: pointer; color: var(--text-primary); font-weight: 500;">View Profile</button>
                </div>
            `;
            container.appendChild(card);
        });
    }
}

function renderWalletPage(data) {
    // Balance
    // Assuming H2 inside the balance card or specifically by ID if available. 
    // Previous code used querySelector('h2'). Let's stick to that but add the specific span ID if present in HTML
    const balanceEl = document.getElementById("walletBalance"); 
    if(balanceEl) balanceEl.textContent = formatCurrency(data.wallet.balance).replace("₹", ""); // Keep pure number if inside h2 with ₹ prefix, or just replace text. 
    // Actually in HTML: <h2>₹ <span id="walletBalance">0.00</span></h2>
    // So target the span preferably.
    const preciseBalanceEl = document.getElementById("walletBalance");
    if(preciseBalanceEl) preciseBalanceEl.textContent = formatCurrency(data.wallet.balance).replace("₹", "").trim();

    // PDF Download Logic
    const downloadPdfBtn = document.getElementById("downloadPdfBtn");
    if (downloadPdfBtn && !downloadPdfBtn.dataset.bound) {
        downloadPdfBtn.addEventListener("click", () => exportWalletPDF(data.wallet.transactions));
        downloadPdfBtn.dataset.bound = true;
    }

    // Transactions
    const tbody = document.querySelector("table tbody");
    if(tbody) {
        tbody.innerHTML = "";
        data.wallet.transactions.forEach(t => {
            const tr = document.createElement("tr");
            const isCredit = t.type === "credit";
            const color = isCredit ? "var(--success-color)" : "var(--text-primary)";
            
            tr.innerHTML = `
                <td>${t.id}</td>
                <td>${new Date(t.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                <td>${t.desc}</td>
                <td>${t.method}</td>
                <td style="color: ${color}; font-weight: 600;">${isCredit ? '+' : ''}${formatCurrency(t.amount)}</td>
                <td><span class="status delivered">${t.status}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    // --- Interaction Logic ---
    setupWalletInteractions(data);
}

// Shared Wallet Logic (Used in Dashboard & Wallet Page)
function setupWalletInteractions(data) {
    const addMoneyBtn = document.getElementById("addMoneyBtn");
    const withdrawBtn = document.getElementById("withdrawBtn");

    if (addMoneyBtn && !addMoneyBtn.dataset.bound) {
        addMoneyBtn.addEventListener("click", () => {
            const amountStr = prompt("Enter amount to add (₹):", "500");
            const amount = parseFloat(amountStr);
            if (!amount || amount <= 0) return alert("Invalid amount");

            // Mock Gateway Integration
            const options = {
                "key": "mock_key", // Not used but kept for structure
                "amount": amount * 100, // Paise
                "currency": "INR",
                "name": "LogiSir Logistics",
                "description": "Wallet Recharge",
                "image": "https://ui-avatars.com/api/?name=L+S&background=0D8ABC&color=fff",
                "handler": function (response) {
                    // Success
                    data.wallet.balance += amount;
                    data.wallet.transactions.unshift({
                        id: response.razorpay_payment_id || `#PAY-${Date.now()}`,
                        date: new Date().toISOString(),
                        desc: "Wallet Recharge",
                        method: "Razorpay (Card/UPI)",
                        amount: amount,
                        type: "credit",
                        status: "Success"
                    });
                    saveData(data);
                    // alert(`Payment Successful! ₹${amount} added.`); // Alert removed for smoother flow
                    renderWalletPage(data);
                    renderGlobal(data); 
                }
            };
            openMockGateway(options);
        });
        addMoneyBtn.dataset.bound = true;
    }

    if (withdrawBtn && !withdrawBtn.dataset.bound) {
        withdrawBtn.addEventListener("click", () => {
            const amountStr = prompt("Enter amount to withdraw (₹):", "1000");
            const amount = parseFloat(amountStr);
            if (!amount || amount <= 0) return alert("Invalid amount");
            
            if (amount > data.wallet.balance) return alert("Insufficient Balance.");

            // Simulate Withdraw
            if(confirm(`Confirm withdrawal of ₹${amount} to linked bank account?`)) {
                data.wallet.balance -= amount;
                data.wallet.transactions.unshift({
                    id: `#WD-${Date.now()}`,
                    date: new Date().toISOString(),
                    desc: "Withdrawal to Bank",
                    method: "Bank Transfer",
                    amount: -amount,
                    type: "debit",
                    status: "Processed"
                });
                saveData(data);
                alert("Withdrawal request processed.");
                renderWalletPage(data);
                renderGlobal(data);
            }
        });
        withdrawBtn.dataset.bound = true;
    }
}

function renderAnalyticsPage(data) {
    const revenueEl = document.querySelector(".stat-card:first-child h3");
    if(revenueEl) {
        // Calculate total revenue from shipments
        const totalRev = data.shipments.reduce((acc, curr) => acc + curr.amount, 0);
        revenueEl.textContent = formatCurrency(totalRev);
    }
}

function renderSettingsPage(data) {
    const firstNameInput = document.getElementById("firstName");
    const lastNameInput = document.getElementById("lastName");
    const emailInput = document.getElementById("email");
    const emailNotif = document.getElementById("emailNotif");
    const smsNotif = document.getElementById("smsNotif");
    const saveIndicator = document.getElementById("saveIndicator");
    
    // 1. Populate Fields
    if(firstNameInput && lastNameInput && emailInput) {
        const [first, ...last] = data.user.name.split(" ");
        firstNameInput.value = first || "";
        lastNameInput.value = last.join(" ") || "";
        emailInput.value = data.user.email;
        
        emailNotif.checked = data.user.notifications.email;
        smsNotif.checked = data.user.notifications.sms;
    }

    // 2. Auto-Save Function
    const autoSave = () => {
        if(!firstNameInput) return;
        
        const newName = `${firstNameInput.value} ${lastNameInput.value}`.trim();
        const newEmail = emailInput.value;
        
        data.user.name = newName;
        data.user.email = newEmail;
        data.user.notifications.email = emailNotif.checked;
        data.user.notifications.sms = smsNotif.checked;
        
        saveData(data);
        
        // Show Indicator
        if(saveIndicator) {
            saveIndicator.style.opacity = "1";
            setTimeout(() => { saveIndicator.style.opacity = "0"; }, 2000);
        }
    };

    const inputs = [firstNameInput, lastNameInput, emailInput, emailNotif, smsNotif];
    inputs.forEach(input => {
        if(input) input.addEventListener("change", autoSave);
    });

    // 4. Password Update Logic
    const updatePasswordBtn = document.getElementById("updatePasswordBtn");
    if(updatePasswordBtn) {
        updatePasswordBtn.onclick = () => {
            const newPass = document.getElementById("newPassword").value;
            const confirmPass = document.getElementById("confirmPassword").value;
            
            if(!newPass || !confirmPass) return alert("Please fill in both password fields.");
            if(newPass !== confirmPass) return alert("Passwords do not match.");
            if(newPass.length < 6) return alert("Password must be at least 6 characters.");
            
            data.user.password = newPass; // Saving to local mock data
            saveData(data);
            
            alert("Password updated successfully!");
            document.getElementById("newPassword").value = "";
            document.getElementById("confirmPassword").value = "";
        };
    }
    // 5. Image Upload Logic
    const avatarInput = document.getElementById("avatarInput");
    const settingsAvatar = document.getElementById("settingsAvatar");
    
    // Set initial image if exists
    if(settingsAvatar && data.user.avatar) {
        settingsAvatar.src = data.user.avatar;
    }

    if(avatarInput) {
        avatarInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if(file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const base64String = event.target.result;
                    
                    // Update Data
                    data.user.avatar = base64String;
                    saveData(data);
                    
                    // Update UI
                    if(settingsAvatar) settingsAvatar.src = base64String;
                    document.querySelectorAll(".profile-info img").forEach(img => img.src = base64String);
                    
                    // Show saved indicator
                    if(saveIndicator) {
                        saveIndicator.style.opacity = "1";
                        setTimeout(() => { saveIndicator.style.opacity = "0"; }, 2000);
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Update Global UI (Header Name, etc.)
    renderGlobal(data); 
}

function renderOrdersPage(data) {
    const tbody = document.querySelector("table tbody");
    if (!tbody) return;

    // --- Stats Calculation ---
    const totalOrders = data.orders.length;
    let pending = 0, completed = 0, transit = 0, cancelled = 0, delayed = 0;
    
    // For Charts
    const statusCounts = {};
    const cityCounts = {};
    let totalDeliveryTime = 0;
    let deliveredCount = 0;

    data.orders.forEach(o => {
        // Status Counts
        const status = o.status;
        statusCounts[status] = (statusCounts[status] || 0) + 1;

        if (status === "Processing" || status === "Pending") pending++;
        if (status === "Delivered") {
            completed++;
            deliveredCount++;
            totalDeliveryTime += (o.deliveryTime || 0);
        }
        if (status === "In Transit" || status === "Shipped") transit++;
        if (status === "Cancelled") cancelled++;
        if (status === "Delayed") delayed++;

        // City Counts
        const city = o.destination || "Other";
        cityCounts[city] = (cityCounts[city] || 0) + 1;
    });

    // Update Stats UI
    document.getElementById("statTotalOrders").innerText = totalOrders;
    document.getElementById("statPendingOrders").innerText = pending;
    document.getElementById("statCompletedOrders").innerText = completed;
    document.getElementById("statTransitOrders").innerText = transit;
    document.getElementById("statCancelledOrders").innerText = cancelled;
    document.getElementById("statDelayedOrders").innerText = delayed;


    // --- Render Table ---
    data.orders.forEach(o => {
        const tr = document.createElement("tr");
        let statusClass = "pending";
        if (o.status === "Delivered") statusClass = "delivered";
        if (o.status === "Shipped" || o.status === "In Transit") statusClass = "transit";
        if (o.status === "Cancelled") statusClass = "warning";
        if (o.status === "Delayed") statusClass = "warning"; // Use warning for delayed too

        tr.innerHTML = `
            <td>${o.id}</td>
             <td>
               <div class="user-cell">
                <img src="https://ui-avatars.com/api/?name=${o.customer.replace(" ", "+")}&background=random" alt="" />
                ${o.customer}
               </div>
            </td>
            <td>${new Date(o.date).toLocaleDateString()}</td>
            <td>${o.items} items</td>
            <td><span class="status ${statusClass}">${o.status}</span></td>
            <td>${formatCurrency(o.total)}</td>
            <td><button class="action-btn"><i class="fa-solid fa-ellipsis"></i></button></td>
        `;
        tbody.appendChild(tr);
    });

    // --- Render Charts ---
    // 1. Orders by Status
    new Chart(document.getElementById('ordersStatusChart'), {
        type: 'bar',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                label: 'Orders',
                data: Object.values(statusCounts),
                backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#6366f1'],
                borderRadius: 4
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });

    // 2. Fulfillment Rate (Doughnut)
    const fulfillmentRate = totalOrders > 0 ? Math.round((completed / totalOrders) * 100) : 0;
    new Chart(document.getElementById('fulfillmentRateChart'), {
        type: 'doughnut',
        data: {
            labels: ['Fulfilled', 'Pending/Other'],
            datasets: [{
                data: [completed, totalOrders - completed],
                backgroundColor: ['#10b981', '#e5e7eb'],
                borderWidth: 0
            }]
        },
        options: { 
            responsive: true, 
            cutout: '70%',
            plugins: { 
                title: { display: true, text: `${fulfillmentRate}%`, position: 'bottom' } 
            }
        }
    });

    // 3. Average Delivery Time (Line - Mock Trend)
    const avgDeliveryTime = deliveredCount > 0 ? (totalDeliveryTime / deliveredCount).toFixed(1) : 0;
    new Chart(document.getElementById('deliveryTimeChart'), {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Avg Days',
                data: [0, 0, 0, avgDeliveryTime], // Mock trend ending in current avg
                borderColor: '#4f46e5',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(79, 70, 229, 0.1)'
            }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });

    // 4. Top Destinations (Bar)
    new Chart(document.getElementById('destinationsChart'), {
        type: 'bar',
        indexAxis: 'y',
        data: {
            labels: Object.keys(cityCounts),
            datasets: [{
                label: 'Orders',
                data: Object.values(cityCounts),
                backgroundColor: '#8b5cf6',
                borderRadius: 4
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });

    // --- Export Functionality (Enhanced) ---
     const exportBtn = document.getElementById("exportBtn");
     if(exportBtn && !exportBtn.dataset.bound) {
       exportBtn.addEventListener("click", () => {
           if (!window.jspdf || !window.jspdf.jsPDF) {
               alert("PDF Library not loaded. Please refresh.");
               return;
           }

           const doc = new window.jspdf.jsPDF();
           
           // Header
           doc.setFontSize(20);
           doc.setTextColor(79, 70, 229);
           doc.text("LogiSir - Order Report", 14, 20);
           
           doc.setFontSize(10);
           doc.setTextColor(100);
           doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

           // Summary Stats
           doc.setFontSize(12);
           doc.setTextColor(0);
           doc.text("Executive Summary", 14, 40);
           
           const summaryData = [
               ["Total Orders", totalOrders.toString()],
               ["Completed", completed.toString()],
               ["Pending", pending.toString()],
               ["Avg Delivery Time", `${avgDeliveryTime} Days`],
               ["Fulfillment Rate", `${fulfillmentRate}%`]
           ];
           
           doc.autoTable({
               startY: 45,
               head: [['Metric', 'Value']],
               body: summaryData,
               theme: 'plain',
               styles: { fontSize: 10, cellPadding: 2 },
               columnStyles: { 0: { fontStyle: 'bold', width: 50 } }
           });

           // Order Details Table
           const tableColumn = ["ID", "Customer", "Date", "Status", "Total", "Destination"];
           const tableRows = data.orders.map(o => [
               o.id,
               o.customer,
               new Date(o.date).toLocaleDateString(),
               o.status,
               formatCurrency(o.total),
               o.destination || "N/A"
           ]);

           doc.text("Detailed Order List", 14, doc.lastAutoTable.finalY + 15);
           
           doc.autoTable({
               startY: doc.lastAutoTable.finalY + 20,
               head: [tableColumn],
               body: tableRows,
               theme: 'grid',
               headStyles: { fillColor: [79, 70, 229] },
               styles: { fontSize: 9 }
           });

           // Note: capturing charts as images is complex without html2canvas and proper await logic. 
           // For this implementation, we provide a robust textual report which is often more professional for printing.
           
           doc.save("Order_Management_Report.pdf");
       });
       exportBtn.dataset.bound = true;
   }
}
        



function setupCreateShipmentPage(data) {
    const form = document.getElementById("createShipmentForm");
    if(form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            
            // Calculate final price based on selection
            const weight = parseFloat(formData.get("weight")) || 0.5;
            const service = formData.get("service");
            const price = service === "Express" ? Math.round(350 + (weight * 100)) : Math.round(150 + (weight * 50));
            
                const createShipment = async () => {
                const trackingId = `TRK-${Math.floor(100000 + Math.random() * 900000)}`;
                const newShipment = {
                    trackingId: trackingId,
                    sender: {
                        name: formData.get("senderName"),
                        address: formData.get("senderAddress"),
                        phone: formData.get("senderPhone")
                    },
                    receiver: {
                        name: formData.get("receiverName"),
                        address: formData.get("receiverAddress"),
                        phone: formData.get("receiverPhone")
                    },
                    status: "Pending",
                    weight: weight,
                    dimensions: formData.get("dimensions") || "N/A",
                    amount: price // Assuming price is calculated above
                };
                
                try {
                    const token = localStorage.getItem('token');
                    const response = await fetch('/api/shipments', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-auth-token': token
                        },
                        body: JSON.stringify(newShipment)
                    });

                    if (response.ok) {
                        const savedShipment = await response.json();
                        
                        // Deduct from wallet (local update)
                        data.wallet.balance -= price;
                        data.wallet.transactions.unshift({
                            id: `#TXN-${Math.floor(1000 + Math.random() * 9000)}`,
                            date: new Date().toISOString(),
                            desc: `Shipment ${savedShipment.trackingId}`,
                            method: "Wallet Balance",
                            amount: -price,
                            type: "debit",
                            status: "Completed"
                        });
                        
                        saveData(data);
                        alert(`Shipment Created Successfully! Tracking ID: ${savedShipment.trackingId}`);
                        window.location.href = "shipments.html";
                    } else {
                        const errData = await response.json();
                        alert(errData.msg || "Failed to create shipment.");
                    }
                } catch (err) {
                    console.error('Error creating shipment:', err);
                    alert("A server error occurred while creating the shipment.");
                }
            };

            // Check Balance
            if (data.wallet.balance >= price) {
                createShipment();
            } else {
                // Insufficient Balance - Prompt Razorpay
                if(!confirm(`Insufficient wallet balance (₹${data.wallet.balance}). Pay ₹${price} via Razorpay to proceed?`)) return;

                // Insufficient Balance - Prompt Razorpay
                // Insufficient Balance - Prompt Mock Gateway
                const options = {
                    "key": "mock_key",
                    "amount": price * 100, // Paise
                    "currency": "INR",
                    "name": "LogiSir Logistics",
                    "description": "Shipment Payment",
                    "image": "https://ui-avatars.com/api/?name=L+S&background=0D8ABC&color=fff",
                    "handler": function (response) {
                        // Success - Credit then Debit
                        data.wallet.balance += price;
                        data.wallet.transactions.unshift({
                            id: response.razorpay_payment_id || `#PAY-${Date.now()}`,
                            date: new Date().toISOString(),
                            desc: "Auto-Recharge for Shipment",
                            method: "Razorpay",
                            amount: price,
                            type: "credit",
                            status: "Success"
                        });
                        saveData(data);
                        
                        // Proceed to create shipment (which debits again)
                        createShipment();
                    }
                };
                openMockGateway(options);
            }
        });
    }
}


function setupAddCustomerPage(data) {
    const form = document.getElementById("addCustomerForm");
    if(form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            
            const newCustomer = {
                id: data.customers.length + 1,
                name: formData.get("name"),
                company: formData.get("location"), // Mapping loction to company/short desc for display
                email: formData.get("email"),
                orders: 0,
                spent: 0,
                status: formData.get("status")
            };
            
            data.customers.unshift(newCustomer);
            saveData(data);
            
            alert(`Customer ${newCustomer.name} added successfully!`);
            window.location.href = "customers.html";
        });
    }
}

function setupKYCPage(data) {
    // Mobile Display
    const mobileField = document.getElementById("registeredMobile");
    const mobileDisplay = document.querySelector(".mobile-display");
    
    if(mobileField) {
        const phone = data.user.phone || "9876543210"; 
        mobileField.value = `+91 ${phone}`;
        if(mobileDisplay) {
            mobileDisplay.innerText = `+91 ${phone}`;
            mobileDisplay.style.color = "#059669";
            mobileDisplay.style.fontWeight = "600";
        }
    }

    const form = document.getElementById("kycForm");
    if(form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            
            // Check declarations
            const decl1 = document.getElementById("mobileLinkDeclaration");
            const decl2 = document.getElementById("kycDeclaration");
            
            if(!decl1.checked || !decl2.checked) {
                alert("Please agree to all declarations to proceed.");
                return;
            }

            const btn = form.querySelector(".btn-submit");
            
            // Simulation UI
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Verifying with Govt Database...`;
            btn.style.background = "#4f46e5";
            
            // Simulate API Delay
            setTimeout(() => {
                alert("Documents Submitted! Verification Pending.");
                btn.innerHTML = `<i class="fa-solid fa-clock"></i> Verification Pending`;
                btn.style.background = "#f59e0b";
                
                // Keep form disabled to show completion
                Array.from(form.elements).forEach(el => el.disabled = true);
                
                // Update User Status in Data
                data.user.kycStatus = "Pending";
                saveData(data);
                
                setTimeout(() => window.location.href='dashboard.html', 1500);
                
            }, 2000); 
        });
    }
}

function getStatusClass(status) {
    switch(status.toLowerCase()) {
        case 'delivered': return 'delivered';
        case 'in transit': return 'transit';
        case 'pending': return 'pending';
        case 'exception': return 'warning';
        default: return '';
    }
}

function setupLogout() {
    const logoutBtns = document.querySelectorAll(".logout-section a");
    if (logoutBtns.length === 0) return;

    logoutBtns.forEach(btn => {
        btn.onclick = (e) => { // Use onclick to override any potential listeners
            e.preventDefault();
            if(confirm("Are you sure you want to logout?")) {
                localStorage.removeItem("isLoggedIn");
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                localStorage.removeItem("userEmail");
                localStorage.removeItem("userName");
                window.location.href = "index.html";
            }
        };
    });
}

function setupSidebar() {
    const sidebar = document.querySelector(".sidebar");
    const mainContent = document.querySelector(".main-content");
    const toggleBtn = document.getElementById("sidebar-toggle");

    if (!sidebar || !toggleBtn) return;

    // Helper to Apply State
    const applyState = (isMobile, isCollapsed) => {
        if (isMobile) {
            // Mobile Mode: Remove collapsed, handle active via toggle
            sidebar.classList.remove("collapsed");
            if (mainContent) mainContent.classList.remove("sidebar-collapsed");
            // Note: 'active' class determines visibility on mobile (transform: translateX(0))
        } else {
            // Desktop Mode: Respect collapsed preference
            sidebar.classList.remove("active"); // Hide mobile drawer if switch from mobile
            if (isCollapsed) {
                sidebar.classList.add("collapsed");
                if (mainContent) mainContent.classList.add("sidebar-collapsed");
            } else {
                sidebar.classList.remove("collapsed");
                if (mainContent) mainContent.classList.remove("sidebar-collapsed");
            }
        }
    };

    // Toggle Button Click
    toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent document click from immediately closing
        if (window.innerWidth > 768) {
            // Desktop: Toggle Collapse
            const willCollapse = !sidebar.classList.contains("collapsed");
            sidebar.classList.toggle("collapsed");
            if (mainContent) mainContent.classList.toggle("sidebar-collapsed");
            localStorage.setItem("sidebarCollapsed", willCollapse);
        } else {
            // Mobile: Toggle Drawer
            sidebar.classList.toggle("active");
        }
    });

    // Outside Click (Mobile Only)
    document.addEventListener("click", (e) => {
        if (window.innerWidth <= 768 && sidebar.classList.contains("active")) {
            if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
                sidebar.classList.remove("active");
            }
        }
    });

    // Window Resize Listener
    window.addEventListener("resize", () => {
        const isMobile = window.innerWidth <= 768;
        const savedCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
        applyState(isMobile, savedCollapsed);
    });

    // Initial Load
    const isMobile = window.innerWidth <= 768;
    const savedCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
    applyState(isMobile, savedCollapsed);
}

// --- Mock Payment Gateway (Custom Implementation) ---
function openMockGateway(options) {
    // 1. Inject Styles if not present
    if (!document.getElementById("mock-gateway-style")) {
        const style = document.createElement("style");
        style.id = "mock-gateway-style";
        style.textContent = `
            .mock-modal-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.6); z-index: 10000;
                display: flex; align-items: center; justify-content: center;
                font-family: 'Inter', sans-serif;
                animation: fadeIn 0.2s ease-out;
            }
            .mock-modal {
                background: white; width: 400px; border-radius: 8px;
                box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
                overflow: hidden; display: flex; flex-direction: column;
            }
            .mock-header {
                background: #2b3a55; color: white; padding: 1.5rem;
                display: flex; align-items: center; gap: 1rem;
            }
            .mock-header img {
                width: 50px; height: 50px; border-radius: 4px; background: white;
            }
            .mock-body { padding: 1.5rem; }
            .mock-row { display: flex; justify-content: space-between; margin-bottom: 0.75rem; font-size: 0.9rem; color: #4b5563; }
            .mock-row strong { color: #111827; }
            .mock-amount { font-size: 1.5rem; font-weight: 700; color: #111827; margin: 1rem 0; text-align: center; }
            
            .mock-payment-methods { margin-top: 1.5rem; border-top: 1px solid #e5e7eb; padding-top: 1rem; }
            .mock-method {
                display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem;
                border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 0.5rem;
                cursor: pointer; transition: all 0.2s;
            }
            .mock-method:hover, .mock-method.selected {
                border-color: #4f46e5; background: #eef2ff;
            }
            
            .mock-footer { padding: 1.5rem; background: #f9fafb; border-top: 1px solid #e5e7eb; }
            .mock-btn {
                background: #4f46e5; color: white; width: 100%; padding: 0.875rem;
                border: none; border-radius: 6px; font-weight: 600; font-size: 1rem;
                cursor: pointer; transition: background 0.2s;
            }
            .mock-btn:hover { background: #4338ca; }
            .mock-btn:disabled { background: #9ca3af; cursor: not-allowed; }
            
            .mock-close {
                position: absolute; top: 1rem; right: 1rem; color: white;
                cursor: pointer; font-size: 1.25rem; opacity: 0.7;
            }
            .mock-close:hover { opacity: 1; }
            
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        `;
        document.head.appendChild(style);
    }

    // 2. Create Modal DOM
    const modal = document.createElement("div");
    modal.className = "mock-modal-overlay";
    modal.innerHTML = `
        <div class="mock-modal">
            <div class="mock-header">
                <img src="${options.image || 'https://via.placeholder.com/50'}" alt="Logo">
                <div>
                    <h3 style="margin:0; font-size:1.1rem;">${options.name || 'Merchant'}</h3>
                    <p style="margin:0; font-size:0.8rem; opacity:0.8;">Trusted Payment</p>
                </div>
                <div class="mock-close">&times;</div>
            </div>
            <div class="mock-body">
                <div class="mock-row">
                    <span>Description</span>
                    <strong>${options.description || 'Transaction'}</strong>
                </div>
                <div class="mock-row">
                    <span>Transaction ID</span>
                    <strong>PY-${Math.floor(Math.random()*1000000)}</strong>
                </div>
                
                <div class="mock-amount">₹${(options.amount / 100).toFixed(2)}</div>
                
                <div class="mock-payment-methods">
                    <p style="font-size:0.85rem; color:#6b7280; margin-bottom:0.5rem;">Select Payment Method</p>
                    <div class="mock-method selected">
                        <i class="fa-solid fa-credit-card" style="color:#4f46e5;"></i>
                        <span>Card (Visa/Mastercard)</span>
                    </div>
                    <div class="mock-method">
                        <i class="fa-brands fa-google-pay" style="color:#0F9D58;"></i>
                        <span>UPI / Google Pay</span>
                    </div>
                </div>
            </div>
            <div class="mock-footer">
                <button class="mock-btn" id="mock-pay-btn">Pay ₹${(options.amount / 100).toFixed(2)}</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // 3. Event Listeners
    const closeBtn = modal.querySelector(".mock-close");
    const payBtn = modal.querySelector("#mock-pay-btn");
    
    const closeModal = () => { if(modal) modal.remove(); };

    closeBtn.onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    payBtn.onclick = () => {
        payBtn.disabled = true;
        payBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...`;
        
        setTimeout(() => {
            // Success
            const response = {
                razorpay_payment_id: "pay_" + Math.random().toString(36).substr(2, 9),
                razorpay_order_id: "order_" + Math.random().toString(36).substr(2, 9),
                razorpay_signature: "sig_" + Math.random().toString(36).substr(2, 9)
            };
            
            if (options.handler) {
                options.handler(response);
            }
            
            closeModal();
        }, 2000); // 2 second delay for realism
    };
}

// --- NEW RENDER FUNCTIONS ---

function renderFleetPage(data) {
    if(!data.fleet) return;
    
    // Stats
    const totalEl = document.getElementById("statTotalVehicles");
    if(totalEl) totalEl.innerText = data.fleet.vehicles.length;
    
    const activeEl = document.getElementById("statActiveVehicles");
    if(activeEl) activeEl.innerText = data.fleet.vehicles.filter(v => v.status === "Active").length;
    
    const idleEl = document.getElementById("statIdleVehicles");
    if(idleEl) idleEl.innerText = data.fleet.vehicles.filter(v => v.status === "Idle").length;
    
    const maintEl = document.getElementById("statMaintenanceVehicles");
    if(maintEl) maintEl.innerText = data.fleet.vehicles.filter(v => v.status === "Maintenance").length;

    // Alerts
    const alertsList = document.getElementById("maintenanceAlertsList");
    if(alertsList) {
        alertsList.innerHTML = data.fleet.maintenanceAlerts.map(alert => 
            `<li style="padding: 0.5rem 0; border-bottom: 1px solid #f3f4f6; color: #4b5563; font-size: 0.9rem;">
                <i class="fa-solid fa-triangle-exclamation" style="color: #ef4444; margin-right: 0.5rem;"></i> ${alert}
             </li>`
        ).join("");
    }

    // Vehicle Table
    const vTbody = document.querySelector("#vehicleTable tbody");
    if(vTbody) {
        vTbody.innerHTML = data.fleet.vehicles.map(v => `
            <tr>
                <td>${v.id}</td>
                <td>${v.model}</td>
                <td>${v.driver}</td>
                <td><span class="status ${v.status === 'Active' ? 'delivered' : v.status === 'Maintenance' ? 'warning' : 'pending'}">${v.status}</span></td>
                <td>
                    <div style="width: 100%; background: #e5e7eb; border-radius: 4px; height: 8px;">
                        <div style="width: ${v.fuel}%; background: ${v.fuel > 20 ? '#10b981' : '#ef4444'}; height: 100%; border-radius: 4px;"></div>
                    </div>
                    <span style="font-size: 0.75rem;">${v.fuel}%</span>
                </td>
                <td>${v.lastService}</td>
            </tr>
        `).join("");
    }

    // Driver Table
    const dTbody = document.querySelector("#driverTable tbody");
    if(dTbody) {
        dTbody.innerHTML = data.fleet.drivers.map(d => `
            <tr>
                <td>${d.name}</td>
                <td>${d.assignments} Trips</td>
                <td><i class="fa-solid fa-star" style="color: #f59e0b;"></i> ${d.rating}</td>
                <td><span class="status ${d.status === 'On Duty' ? 'delivered' : 'pending'}">${d.status}</span></td>
            </tr>
        `).join("");
    }

    // Charts
    const fuelCtx = document.getElementById('fuelChart');
    if(fuelCtx) {
        new Chart(fuelCtx, {
            type: 'line',
            data: {
                labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
                datasets: [{
                    label: 'Fuel Consumption (L)',
                    data: data.fleet.fuelLogs,
                    borderColor: '#ef4444',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(239, 68, 68, 0.1)'
                }]
            },
            options: { responsive: true }
        });
    }

    const expenseCtx = document.getElementById('expenseChart');
    if(expenseCtx) {
        new Chart(expenseCtx, {
            type: 'bar',
            data: {
                labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
                datasets: [{
                    label: 'Expenses (₹)',
                    data: data.fleet.expenses,
                    backgroundColor: '#f59e0b',
                    borderRadius: 4
                }]
            },
            options: { responsive: true }
        });
    }
}

function renderInventoryPage(data) {
    if(!data.inventory) return;

    // Stats
    const whEl = document.getElementById("statTotalWarehouses");
    if(whEl) whEl.innerText = data.inventory.warehouses.length;
    
    const inEl = document.getElementById("statInbound");
    if(inEl) inEl.innerText = data.inventory.stats.inbound;
    
    const outEl = document.getElementById("statOutbound");
    if(outEl) outEl.innerText = data.inventory.stats.outbound;
    
    const lowEl = document.getElementById("statLowStock");
    if(lowEl) lowEl.innerText = data.inventory.stats.lowStock;

    // Table
    const tbody = document.querySelector("#inventoryTable tbody");
    if(tbody) {
        tbody.innerHTML = data.inventory.items.map(item => `
            <tr>
                <td>${item.sku}</td>
                <td>${item.name}</td>
                <td>${item.warehouse}</td>
                <td>${item.stock} Units</td>
                <td><span class="status ${item.status === 'In Stock' ? 'delivered' : item.status === 'Out of Stock' ? 'warning' : 'pending'}">${item.status}</span></td>
                <td>${formatCurrency(item.value)}</td>
            </tr>
        `).join("");
    }

    // Charts
    const commonOptions = { responsive: true, plugins: { legend: { display: false } } };

    const tCtx = document.getElementById('turnoverChart');
    if(tCtx) {
        new Chart(tCtx, {
            type: 'line',
            data: {
                labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
                datasets: [{
                    label: 'Turnover Rate',
                    data: data.inventory.charts.turnover,
                    borderColor: '#4f46e5',
                    tension: 0.4
                }]
            },
            options: commonOptions
        });
    }

    const dCtx = document.getElementById('demandChart');
    if(dCtx) {
        new Chart(dCtx, {
            type: 'bar',
            data: {
                labels: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'],
                datasets: [{
                    label: 'Forecast Demand',
                    data: data.inventory.charts.demand,
                    backgroundColor: '#10b981',
                    borderRadius: 4
                }]
            },
            options: commonOptions
        });
    }

    const sCtx = document.getElementById('shrinkageChart');
    if(sCtx) {
        new Chart(sCtx, {
            type: 'doughnut',
            data: {
                labels: ['Damage', 'Theft', 'Error', 'Expired'],
                datasets: [{
                    data: data.inventory.charts.shrinkage,
                    backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#6b7280']
                }]
            },
            options: { responsive: true, cutout: '60%' }
        });
    }

    const cCtx = document.getElementById('costChart');
    if(cCtx) {
        new Chart(cCtx, {
            type: 'radar',
            data: {
                labels: ['Purchasing', 'Storage', 'Handling', 'Admin'],
                datasets: [{
                    label: 'Costs',
                    data: data.inventory.charts.cost,
                    backgroundColor: 'rgba(79, 70, 229, 0.2)',
                    borderColor: '#4f46e5',
                    pointBackgroundColor: '#4f46e5'
                }]
            },
            options: { responsive: true }
        });
    }
}

function renderIncomePage(data) {
    if(!data.income) return;

    // Banner Name
    const bannerName = document.getElementById("congratsName");
    if(bannerName) bannerName.innerText = data.user.name.split(" ")[0] || "User";

    // Metrics
    const set = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val.toLocaleString(); };
    set("statItemsSold", data.income.stats.itemsSold);
    set("statDownloads", data.income.stats.downloads);
    set("statDocuments", data.income.stats.documents);
    set("statNewOrders", data.income.stats.newOrders);
    set("statProducts", data.income.stats.products);
    set("statInvoices", data.income.stats.invoices);

    // Special Cards
    const setRaw = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
    setRaw("specialProducts", "0");
    setRaw("specialOrders", "0");
    setRaw("specialReviews", "0");

    // Transactions Table
    const tbody = document.querySelector("#transactionsTable tbody");
    if(tbody) {
        tbody.innerHTML = data.income.transactions.map(t => `
            <tr>
                <td>${t.id}</td>
                <td>${new Date(t.date).toLocaleDateString()}</td>
                <td>${t.customer}</td>
                <td>${formatCurrency(t.amount)}</td>
                <td><span class="status ${t.status === 'Completed' ? 'delivered' : t.status === 'Failed' ? 'warning' : 'pending'}">${t.status}</span></td>
            </tr>
        `).join("");
    }

    // Charts
    const salesCtx = document.getElementById('salesMonthChart');
    if(salesCtx) {
        new Chart(salesCtx, {
            type: 'line',
            data: {
                labels: Array.from({length: data.income.charts.salesMonth.length}, (_, i) => i + 1),
                datasets: [{
                    label: 'Sales',
                    data: data.income.charts.salesMonth,
                    borderColor: '#10b981',
                    fill: true,
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { display: false } } }
        });
    }

    const revCtx = document.getElementById('revenueChart');
    if(revCtx) {
        new Chart(revCtx, {
            type: 'bar',
            data: {
                labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
                datasets: [{
                    label: 'Revenue',
                    data: data.income.charts.revenue,
                    backgroundColor: '#4f46e5',
                    borderRadius: 4
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }

    const leadsCtx = document.getElementById('leadsChart');
    if(leadsCtx) {
        new Chart(leadsCtx, {
            type: 'line',
            data: {
                labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
                datasets: [{
                    label: 'Leads',
                    data: data.income.charts.leads,
                    borderColor: '#f59e0b',
                    tension: 0.4
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }

    const incCtx = document.getElementById('incomeChart');
    if(incCtx) {
        new Chart(incCtx, {
            type: 'bar',
            data: {
                labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
                datasets: [{
                    label: 'Income',
                    data: data.income.charts.income,
                    backgroundColor: '#8b5cf6',
                    borderRadius: 4
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }

    const chanCtx = document.getElementById('channelsChart');
    if(chanCtx) {
        new Chart(chanCtx, {
            type: 'doughnut',
            data: {
                labels: ['Direct', 'Referral', 'Social', 'Ads'],
                datasets: [{
                    data: data.income.charts.channels,
                    backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}

function renderInvoicesPage(data) {
    if(!data.invoicesList) return;

    // Calculate Stats
    const total = data.invoicesList.reduce((sum, inv) => sum + inv.amount, 0);
    const paid = data.invoicesList.filter(i => i.status === "Paid").reduce((sum, inv) => sum + inv.amount, 0);
    const pending = data.invoicesList.filter(i => i.status === "Pending").reduce((sum, inv) => sum + inv.amount, 0);
    const overdue = data.invoicesList.filter(i => i.status === "Overdue").reduce((sum, inv) => sum + inv.amount, 0);

    const set = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = formatCurrency(val); };
    set("invTotalAmount", total);
    set("invPaidAmount", paid);
    set("invPendingAmount", pending);
    set("invOverdueAmount", overdue);

    // Table
    const tbody = document.querySelector("#invoiceTable tbody");
    if(tbody) {
        tbody.innerHTML = data.invoicesList.map(inv => `
            <tr>
                <td><a href="view-invoice.html?id=${inv.id}" style="color:#4f46e5; font-weight:600;">${inv.id}</a></td>
                <td>${inv.client}</td>
                <td>${new Date(inv.date).toLocaleDateString()}</td>
                <td>${new Date(inv.dueDate).toLocaleDateString()}</td>
                <td>${formatCurrency(inv.amount)}</td>
                <td><span class="status ${inv.status === 'Paid' ? 'delivered' : inv.status === 'Overdue' ? 'warning' : 'pending'}">${inv.status}</span></td>
                <td>
                    <button class="action-btn" title="Download PDF"><i class="fa-solid fa-download"></i></button>
                    <a href="view-invoice.html?id=${inv.id}" class="action-btn" title="View"><i class="fa-solid fa-eye"></i></a>
                </td>
            </tr>
        `).join("");
    }
}

function renderReportsPage(data) {
    if(!data.reports) return;

    // Stats
    const set = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val.toLocaleString(); };
    set("repProducts", data.reports.stats.products);
    set("repOrders", data.reports.stats.orders);
    set("repCustomers", data.reports.stats.customers);
    set("repReviews", data.reports.stats.reviews);

    // Summary
    set("repTotalOrders", data.reports.summary.totalOrders);
    
    const setCurr = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = formatCurrency(val); };
    setCurr("repTotalSales", data.reports.summary.totalSales);
    setCurr("repTotalProfit", data.reports.summary.totalProfit);
    setCurr("repTotalRevenue", data.reports.summary.totalRevenue);

    // Order Table
    const orderTbody = document.querySelector("#repOrderTable tbody");
    if(orderTbody) {
        orderTbody.innerHTML = data.reports.history.map(h => `
             <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:0.8rem 0;">${h.id}</td>
                <td>${h.customer}</td>
                <td>${formatCurrency(h.amount)}</td>
                <td><span class="status ${h.status === 'Delivered' ? 'delivered' : 'pending'}">${h.status}</span></td>
            </tr>
        `).join("");
    }

    // Notifications List
    const notifList = document.getElementById("repNotificationsList");
    if(notifList) {
        notifList.innerHTML = data.reports.notifications.map(n => `
             <div class="notif-item">
                <div class="notif-icon"><i class="fa-solid ${n.icon}"></i></div>
                <div>
                    <p style="font-size:0.9rem; color:#111827; margin-bottom:0.2rem;">${n.msg}</p>
                    <p style="font-size:0.8rem; color:#9ca3af;">${n.time}</p>
                </div>
            </div>
        `).join("");
    }

    // Invoices List
    const invList = document.getElementById("repInvoicesList");
    if(invList && data.reports.invoices) {
        invList.innerHTML = data.reports.invoices.map(i => `
             <div class="invoice-item">
                <div>
                     <p style="font-weight:600; font-size:0.9rem;">${i.id}</p>
                     <p style="font-size:0.8rem; color:#6b7280;">${formatCurrency(i.amount)}</p>
                </div>
                <span class="status ${i.status === 'Paid' ? 'delivered' : 'pending'}">${i.status}</span>
            </div>
        `).join("");
    }

    // Chart
    const ctx = document.getElementById('yearlySalesChart');
    if(ctx) {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                    label: 'Sales (₹)',
                    data: data.reports.yearlySales,
                    borderColor: '#4f46e5',
                    fill: true,
                    backgroundColor: 'rgba(79, 70, 229, 0.05)',
                    tension: 0.4
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }
}

function renderViewInvoicePage(data) {
    const params = new URLSearchParams(window.location.search);
    const invoiceId = params.get("id");
    
    if(!invoiceId || !data.invoicesList) return;

    const invoice = data.invoicesList.find(i => i.id === invoiceId);
    if(!invoice) return;

    // Helper
    const set = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
    
    // Header & Meta
    set("viewInvNumber", invoice.id);
    set("viewInvDate", new Date(invoice.date).toLocaleDateString());
    
    // Addresses
    set("viewClientName", invoice.client);
    set("viewClientEmail", invoice.email);
    set("viewClientAddr", invoice.address);

    // Items
    const tbody = document.getElementById("viewItemsBody");
    if(tbody && invoice.items) {
        tbody.innerHTML = invoice.items.map(item => `
            <tr>
                <td>${item.desc}</td>
                <td>${item.qty}</td>
                <td>${formatCurrency(item.price)}</td>
                <td>${formatCurrency(item.qty * item.price)}</td>
            </tr>
        `).join("");
    }

    // Totals
    const subtotal = invoice.amount; // Assuming amount is subtotal for simplicity or derived
    const tax = subtotal * 0.10;
    const total = subtotal + tax;

    set("viewSubtotal", formatCurrency(subtotal));
    set("viewTax", formatCurrency(tax));
    set("viewTotal", formatCurrency(total));
}






