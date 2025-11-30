const CLIENT_ID = '167078370634-de0ou8c3hikdba9pq6evimmfekbkk9o6.apps.googleusercontent.com';
let salesPerformanceChart = null;

const ErrorHandler = {
  log: () => {},
  handleError: (error, context) => {
  }
};

function initializeGsi() {
  google.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: handleCredentialResponse
  });
  google.accounts.id.renderButton(
    document.getElementById('g_id_onload'),
    { theme: 'outline', size: 'large' }
  );
  google.accounts.id.prompt();
}





window.handleCredentialResponse = function(response) {
  try {
    if (response.credential) {
      const userPayload = getUserEmailFromToken(response.credential);
      if (userPayload) {
          const userInfo = {
            email: userPayload.email,
            name: userPayload.name,
            picture: userPayload.picture,
            token: response.credential
          };
          localStorage.setItem('userInfo', JSON.stringify(userInfo));
          localStorage.setItem('isLoggedIn', 'true');
          
          currentIdToken = userInfo.token;
          currentUserEmail = userInfo.email;
          window.currentUserEmail = currentUserEmail;

          updateSigninStatus(true, userInfo.name, userInfo.picture);
      } else {
          throw new Error("Failed to decode user credential");
      }
    } else {
      throw new Error("No credential in response");
    }
  } catch (error) {
    updateSigninStatus(false);
  }
};




function getUserEmailFromToken(token) {
    try {
        if (!token) return '';
        const payload = token.split('.')[1];
        const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        const payloadObj = JSON.parse(decodedPayload);
        
        return payloadObj; 
    } catch (error) {
        return null; 
    }
}

function checkNetworkSpeed() {
    try {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection) {
            const effectiveType = connection.effectiveType;
            const saveData = connection.saveData;

            if (saveData || effectiveType.includes('2g')) {
                NotificationHandler.show('Koneksi internet Anda lambat. Beberapa fitur mungkin tidak berfungsi dengan baik.', 'warning');
            }
        }
    } catch (error) {
        ErrorHandler.handleError(error, 'checkNetworkSpeed');
    }
}

document.addEventListener('DOMContentLoaded', () => {
  const manualSignInBtn = document.getElementById('manualSignInBtn');
  if (manualSignInBtn) {
    manualSignInBtn.addEventListener('click', async () => {
      try {
        const authError = document.getElementById('authError');
        const authInfo = document.getElementById('authInfo');
        
        if (authError) {
          authError.style.display = 'none';
          authError.textContent = '';
        }
        
        if (authInfo) {
          authInfo.textContent = 'Memproses permintaan sign-in...';
          authInfo.style.color = '#007bff';
        }
        
        if (tokenClient) {
          
          tokenClient.callback = (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              gapi.client.setToken(tokenResponse);
              currentAccessToken = tokenResponse.access_token;
              
              if (authInfo) {
                authInfo.textContent = 'Sign-in berhasil! Memuat dashboard...';
                authInfo.style.color = '#28a745';
              }
              
              if (window.googleSheetsIntegration) {
                window.googleSheetsIntegration.setup();
              }
            } else {
              if (authError) {
                authError.textContent = 'Sign-in gagal. Silakan coba lagi.';
                authError.style.display = 'block';
              }
              if (authInfo) {
                authInfo.textContent = 'Jika tombol di atas tidak berfungsi, silakan refresh halaman atau coba browser lain.';
                authInfo.style.color = '#6c757d';
              }
            }
          };
          
          tokenClient.error_callback = (error) => {
            if (authError) {
              authError.textContent = 'Sign-in gagal: ' + (error.message || 'Unknown error');
              authError.style.display = 'block';
            }
            if (authInfo) {
              authInfo.textContent = 'Jika tombol di atas tidak berfungsi, silakan refresh halaman atau coba browser lain.';
              authInfo.style.color = '#6c757d';
            }
          };
          
          tokenClient.requestAccessToken({});
        } else {
          if (authError) {
            authError.textContent = 'Authentication service not ready. Please refresh the page.';
            authError.style.display = 'block';
          }
        }
      } catch (error) {
        const authError = document.getElementById('authError');
        if (authError) {
          authError.textContent = 'Sign-in failed. Please try again.';
          authError.style.display = 'block';
        }
      }
    });
  }

  checkNetworkSpeed();
});

function handleSignoutClick() {
  try {
    if (typeof google !== 'undefined' && typeof google.accounts !== 'undefined' && typeof google.accounts.id !== 'undefined') {
      google.accounts.id.disableAutoSelect();
    } else {
    }
    currentIdToken = null;
    updateSigninStatus(false);
    sessionStorage.removeItem('isLoggedIn');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('id_token');
    localStorage.removeItem('accessToken'); 
    ErrorHandler.log("User signed out");
  } catch (error) {
    ErrorHandler.handleError(error, 'handleSignoutClick');
  }
};

function updateSigninStatus(isSignedIn, userName = '', userPicture = '') {
  try {
    ErrorHandler.log(`Updating sign-in status: ${isSignedIn}`);
    const signInWrapper = document.querySelector('.sign-in');
    const mainContent = document.getElementById('main-content');
    const signOutButton = document.getElementById('sign-out-button');
    const wavyLines = document.querySelector('.wavy-lines');
    const userProfileDisplayElement = document.getElementById('userProfileDisplayElement');

    if (!signInWrapper || !mainContent || !signOutButton) {
      ErrorHandler.log('Required DOM elements not found for sign-in status update');
      return;
    }

    if (isSignedIn) {
      const MIN_LOADING_TIME = 0; 
      const startTime = Date.now();

      signInWrapper.style.display = 'none';
      const skeletonLoader = document.getElementById('skeleton-loader');
      if (skeletonLoader) {
          skeletonLoader.style.display = 'flex';
          playSkeletonBuildUpAnimation();
      }
      mainContent.style.display = 'none';
      signOutButton.style.display = 'block';

      if (userProfileDisplayElement) {
          const profilePictureElement = document.getElementById('userProfilePicture');
          const profileNameElement = document.getElementById('userProfileName');
          if (profilePictureElement && profileNameElement) {
              profilePictureElement.src = userPicture;
              profileNameElement.textContent = userName;
              updateWelcomeMessage(userName);
          }
          userProfileDisplayElement.style.display = 'block';
      }
      
      if (wavyLines) {
        wavyLines.style.display = 'none';
      }
      
      if (window.googleSheetsIntegration) {
          window.googleSheetsIntegration.setup().then(() => {
            const elapsedTime = Date.now() - startTime;
            const timeToWait = Math.max(0, MIN_LOADING_TIME - elapsedTime);

            setTimeout(() => {
                if (skeletonLoader) {
                    skeletonLoader.style.display = 'none';
                }
                mainContent.style.display = 'block';
                renderSalesPerformanceChart();
                if (typeof playDashboardEntranceAnimation === 'function') {
                    playDashboardEntranceAnimation();
                }
            }, timeToWait);
          }).catch(error => {
              if (skeletonLoader) {
                  skeletonLoader.style.display = 'none';
              }
              mainContent.style.display = 'block';
          });
      }
      
      localStorage.setItem('isLoggedIn', 'true');
    } else {
      signInWrapper.style.display = 'flex';
      mainContent.style.display = 'none';
      signOutButton.style.display = 'none';
      
      if (userProfileDisplayElement) {
          userProfileDisplayElement.style.display = 'none';
      }
      
      if (wavyLines) {
        wavyLines.style.display = 'block';
      }
    }
  } catch (error) {
    ErrorHandler.handleError(error, 'updateSigninStatus');
  }
}

function safeRefreshData() {
  if (typeof googleSheetsIntegration !== 'undefined' && googleSheetsIntegration.refreshData) {
    googleSheetsIntegration.refreshData();
  } else {
    setTimeout(safeRefreshData, 500);
  }
};

function closeEditModal() {
  try {
    const editModal = document.getElementById('editModal');
    if (editModal) {
      editModal.style.display = 'none';
      editModal.classList.remove('show');
      
      const editForm = document.getElementById('editForm');
      if (editForm) {
        editForm.reset();
      }
      
      const errorDisplay = document.getElementById('errorDisplay');
      if (errorDisplay) {
        errorDisplay.style.display = 'none';
      }
    }
  } catch (error) {
    ErrorHandler.handleError(error, 'closeEditModal');
  }
};

function logViewHistoryForLocation(customerName, odpTerdekat) {
  if (window.googleSheetsIntegration && typeof window.googleSheetsIntegration.logViewHistory === 'function') {
    const userEmail = currentUserEmail || '';
    const location = odpTerdekat || customerName || '';
    window.googleSheetsIntegration.logViewHistory(userEmail, location);
  }
}

function closeViewHistoryModal() {
  try {
    const viewHistoryModal = document.getElementById('viewHistoryModal');
    if (viewHistoryModal) {
      viewHistoryModal.style.display = 'none';
      viewHistoryModal.classList.remove('show');
      
      const historyError = document.getElementById('historyError');
      if (historyError) {
        historyError.style.display = 'none';
      }
      const historyTableBody = document.getElementById('historyTableBody');
      if (historyTableBody) {
        historyTableBody.innerHTML = '';
      }
    }
  } catch (error) {
    ErrorHandler.handleError(error, 'closeViewHistoryModal');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  try {
    ErrorHandler.log('DOM Content Loaded - Initializing application...');
    
    const requiredElements = ['sign-in-container', 'main-content', 'errorDisplay'];
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
      ErrorHandler.log(`Missing elements: ${missingElements.join(', ')}`);
      return;
    }
    
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    ErrorHandler.log(`Login status: ${isLoggedIn}`);
    
    if (isLoggedIn) {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      if (userInfo) {
        currentUserEmail = userInfo.email;
        updateSigninStatus(true, userInfo.name, userInfo.picture);
      }
    }
    
    initializeUIComponents();

    checkNetworkSpeed();

    const customerTableBody = document.querySelector('#customerTable tbody');
    if (customerTableBody) {
        customerTableBody.addEventListener('click', (e) => {
            const toggleBtn = e.target.closest('.btn-toggle-details');
            if (toggleBtn) {
                const cardRow = toggleBtn.closest('tr');
                if (cardRow) {
                    cardRow.classList.toggle('details-expanded');
                }
            }
        });
    }

    const govFilterBtn = document.getElementById('btnTableShowGoverment');
    const allFilterBtn = document.getElementById('btnTableShowAll');
    const schoolFilterBtn = document.getElementById('btnTableShowSchool');
    const nonSchoolFilterBtn = document.getElementById('btnTableShowNonSchool');
    const dashboardTutorialLink = document.getElementById('dashboard-tutorial-link');
    const dashboardTutorialModal = document.getElementById('dashboard-tutorial-modal');
    const dashboardTutorialClose = document.getElementById('dashboard-tutorial-close');
    const dashboardTutorialSidebarLinks = document.querySelectorAll('.dashboard-tutorial-trigger');

    if (dashboardTutorialLink && dashboardTutorialModal && dashboardTutorialClose) {
        dashboardTutorialLink.addEventListener('click', (e) => {
            e.preventDefault();
            dashboardTutorialModal.style.display = 'block';
        });

        dashboardTutorialSidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                dashboardTutorialModal.style.display = 'block';
            });
        });

        dashboardTutorialClose.addEventListener('click', () => {
            dashboardTutorialModal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target == dashboardTutorialModal) {
                dashboardTutorialModal.style.display = 'none';
            }
        });
    }

    function setActiveFilterButton(activeBtn) {
      [allFilterBtn, schoolFilterBtn, nonSchoolFilterBtn, govFilterBtn].forEach(btn => {
        if (btn) {
          btn.classList.remove('active');
        }
      });
      if (activeBtn) {
        activeBtn.classList.add('active');
      }
    }

    if (govFilterBtn) {
      govFilterBtn.addEventListener('click', () => {
        if (window.googleSheetsIntegration) {
          window.googleSheetsIntegration.currentDataView = 'government';
          window.googleSheetsIntegration.governmentCurrentPage = 1;
          window.googleSheetsIntegration.applyCombinedFilters();
          window.googleSheetsIntegration.renderPaginationControls();
          setActiveFilterButton(govFilterBtn);
        }
      });
    }

    if (allFilterBtn) {
      allFilterBtn.addEventListener('click', () => {
        if (window.googleSheetsIntegration) {
          window.googleSheetsIntegration.currentDataView = 'customer';
          window.googleSheetsIntegration.currentSchoolFilter = 'all';
          window.googleSheetsIntegration.currentPage = 1;
          window.googleSheetsIntegration.applyCombinedFilters();
          window.googleSheetsIntegration.renderPaginationControls();
          setActiveFilterButton(allFilterBtn);
        }
      });
    }

    if (schoolFilterBtn) {
      schoolFilterBtn.addEventListener('click', () => {
        if (window.googleSheetsIntegration) {
          window.googleSheetsIntegration.currentDataView = 'customer';
          window.googleSheetsIntegration.currentSchoolFilter = 'school';
          window.googleSheetsIntegration.currentPage = 1;
          window.googleSheetsIntegration.applyCombinedFilters();
          window.googleSheetsIntegration.renderPaginationControls();
          setActiveFilterButton(schoolFilterBtn);
        }
      });
    }

    if (nonSchoolFilterBtn) {
      nonSchoolFilterBtn.addEventListener('click', () => {
        if (window.googleSheetsIntegration) {
          window.googleSheetsIntegration.currentDataView = 'customer';
          window.googleSheetsIntegration.currentSchoolFilter = 'nonSchool';
          window.googleSheetsIntegration.currentPage = 1;
          window.googleSheetsIntegration.applyCombinedFilters();
          window.googleSheetsIntegration.renderPaginationControls();
          setActiveFilterButton(nonSchoolFilterBtn);
        }
      });
    }

    document.addEventListener('salesViewChanged', (e) => {
        const salesName = e.detail.salesName;
        const chartSection = document.querySelector('.chart-section');

        if (!chartSection) return;

        if (salesName && salesName !== 'Home') {
            if (salesPerformanceChart) {
                salesPerformanceChart.destroy();
            }
            chartSection.style.display = 'none';
        } else {
            chartSection.style.display = 'block';
            if (typeof window.renderSalesPerformanceChart === 'function') {
                window.renderSalesPerformanceChart();
            }
        }
    });
    
  } catch (error) {
    ErrorHandler.handleError(error, 'DOMContentLoaded');
  }
});

function initializeUIComponents() {
  try {
    const addSalesModal = document.getElementById('addSalesModal');
    const openAddSalesBtn = document.getElementById('openAddSalesBtn');
    const closeAddSalesModal = document.getElementById('closeAddSalesModal');
    const cancelAddSalesBtn = document.getElementById('cancelAddSalesBtn');
    const editModal = document.getElementById('editModal');
    const toggleCustomerFormBtn = document.getElementById('toggle-customer-form');
    const addCustomerFormContainer = document.getElementById('add-customer-form-container');
    const overviewBtn = document.getElementById('overview-btn');

    const toggleForm = () => {
        const addCustomerSection = document.getElementById('add-customer-section');
        if (addCustomerSection) {
            const isVisible = addCustomerSection.style.display === 'block';
            addCustomerSection.style.display = isVisible ? 'none' : 'block';
            
            if (!isVisible) {
                resetAddCustomerForm();
                populateSalesDropdown();
                addCustomerSection.scrollIntoView({ behavior: 'smooth' });
            }
        }
    };

    if (toggleCustomerFormBtn) {
      toggleCustomerFormBtn.addEventListener('click', toggleForm);
    }

    const fabAddCustomerBtn = document.getElementById('fab-add-customer');
    if (fabAddCustomerBtn) {
      fabAddCustomerBtn.addEventListener('click', toggleForm);
    }
    
    const closeFormBtn = document.getElementById('closeFormBtn');
    if (closeFormBtn) {
      closeFormBtn.addEventListener('click', () => {
        const addCustomerSection = document.getElementById('add-customer-section');
        if (addCustomerSection) {
          addCustomerSection.style.display = 'none';
          resetAddCustomerForm();
        }
      });
    }
    
    const cancelAddCustomerBtn = document.getElementById('cancelAddCustomer');
    if (cancelAddCustomerBtn) {
      cancelAddCustomerBtn.addEventListener('click', () => {
        const addCustomerSection = document.getElementById('add-customer-section');
        if (addCustomerSection) {
          addCustomerSection.style.display = 'none';
          resetAddCustomerForm();
        }
      });
    }
    
    initializeAddCustomerForm();

    populateSalesDropdown();

    if (openAddSalesBtn && addSalesModal) {
      openAddSalesBtn.addEventListener('click', () => {
        addSalesModal.classList.add('show');
      });
    }

    if(closeAddSalesModal && addSalesModal) {
      closeAddSalesModal.addEventListener('click', () => {
        addSalesModal.classList.remove('show');
      });
    }

    if (cancelAddSalesBtn && addSalesModal) {
      cancelAddSalesBtn.addEventListener('click', () => {
        addSalesModal.classList.remove('show');
      });
    }

    window.addEventListener('click', (event) => {
      if (event.target === addSalesModal) addSalesModal.classList.remove('show');
      if (event.target === editModal) editModal.classList.remove('show');
    });

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        const editModal = document.getElementById('editModal');
        const addSalesModal = document.getElementById('addSalesModal');
        
        if (editModal && editModal.classList.contains('show')) {
          closeEditModal();
        }
        
        if (addSalesModal && addSalesModal.classList.contains('show')) {
          addSalesModal.classList.remove('show');
        }
      }
    });

    if (overviewBtn) {
      overviewBtn.addEventListener('click', () => {
        googleSheetsIntegration.filterBySales('Home');
        document.querySelectorAll('.sales-item').forEach(i => i.classList.remove('active'));
        overviewBtn.classList.add('active');
      });
    }
    setupFormHandlers();
  } catch (error) {
    ErrorHandler.handleError(error, 'initializeUIComponents');
  }
};

function setupFormHandlers() {
  try {
    const addSalesForm = document.getElementById('addSalesForm');
    if (addSalesForm) {
      addSalesForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const salesName = document.getElementById('salesName').value.trim();
        if (salesName) {
          ModalHandler.show('Info', 'Fitur tambah sales akan segera tersedia');
          document.getElementById('addSalesModal').classList.remove('show');
          addSalesForm.reset();
        }
      });
    }

    const editForm = document.getElementById('editForm');
    if (editForm) {
      editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        googleSheetsIntegration.saveEdit();
      });
    }
  } catch (error) {
    ErrorHandler.handleError(error, 'setupFormHandlers');
  }
};

function populateEditModal(customerData, rowIndex) {
  try {
    // Populate the edit modal fields with customer data
    document.getElementById('editRowIndex').value = rowIndex;
    document.getElementById('editOdp').value = customerData.odp_terdekat || '';
    document.getElementById('editNama').value = customerData.nama || '';
    document.getElementById('editAlamat').value = customerData.alamat || '';
    document.getElementById('editTelepon').value = (customerData.no_telepon === '-') ? '' : (customerData.no_telepon || '');
    document.getElementById('editSales').value = customerData.nama_sales || '';
    document.getElementById('editVisit').value = customerData.visit || '';
    document.getElementById('editStatus').value = customerData.status || '';
    document.getElementById('originalStatus').value = customerData.status || '';
    document.getElementById('editKeteranganTambahan').value = customerData.keterangan_tambahan || '';

    const editModal = document.getElementById('editModal');
    if (editModal) {
      editModal.style.display = 'block';
      editModal.classList.add('show');
    }
  } catch (error) {
    ErrorHandler.handleError(error, 'populateEditModal');
  }
}

window.addEventListener('error', (event) => {
  if (event.message.includes('refreshData') && event.message.includes('undefined')) {
    return;
  }
  ErrorHandler.handleError(new Error(event.message), 'Global Error');
});

/**
 * Menghapus baris data dari Google Spreadsheet menggunakan GoogleSheetsCRUD
 * @param {number} rowIndex Indeks baris data yang akan dihapus (0-indexed dari data yang ditampilkan, setelah header).
 */
async function deleteCustomerRow(rowIndex) {
    try {
        ErrorHandler.log(`Attempting to delete row at index: ${rowIndex}`);

        if (googleSheetsCRUD) {
            await googleSheetsCRUD.deleteCustomer(rowIndex);
        } else {
            throw new Error('Google Sheets CRUD not initialized');
        }

    } catch (error) {
        ErrorHandler.handleError(error, `deleteCustomerRow for index ${rowIndex}`);
        ModalHandler.show('Error', `Gagal menghapus data: ${error.message}`);
    }
};


window.addEventListener('unhandledrejection', (event) => {
  ErrorHandler.handleError(new Error(event.reason), 'Unhandled Promise Rejection');
});

document.addEventListener('googleSheetsIntegrationReady', () => {
  safeRefreshData();
});

function initializeGoogleSheetsIntegration() {
  if (typeof googleSheetsIntegration === 'undefined') {
    setTimeout(initializeGoogleSheetsIntegration, 1000);
  } else {
    if (googleSheetsIntegration.isInitialized) {
      safeRefreshData();
    }
  }
};

document.addEventListener('DOMContentLoaded', initializeGoogleSheetsIntegration);
function initializeAddCustomerForm() {
  try {
    const addCustomerForm = document.getElementById('addCustomerForm');
    const cancelAddCustomerBtn = document.getElementById('cancelAddCustomer');
    
    if (addCustomerForm) {
      addCustomerForm.addEventListener('submit', handleAddCustomerSubmit);
    }
    
    if (cancelAddCustomerBtn) {
      cancelAddCustomerBtn.addEventListener('click', () => {
        const addCustomerFormContainer = document.getElementById('add-customer-form-container');
        if (addCustomerFormContainer) {
          addCustomerFormContainer.style.display = 'none';
        }
        resetAddCustomerForm();
      });
    }
    
  } catch (error) {
    ErrorHandler.handleError(error, 'initializeAddCustomerForm');
  }
};



function populateSalesDropdown() {
  try {
    const salesSelect = document.getElementById('assignedSales');
    const editSalesSelect = document.getElementById('editSales');
    
    if (!salesSelect || salesSelect.tagName !== 'SELECT' || 
        !editSalesSelect || editSalesSelect.tagName !== 'SELECT') {
      return; 
    }
    
    salesSelect.innerHTML = '<option value="">Pilih Sales</option>';
    editSalesSelect.innerHTML = '<option value="">Pilih Sales</option>';
    
    const salesItems = document.querySelectorAll('.sales-item');
    salesItems.forEach(item => {
      const salesName = item.textContent.trim();
      if (salesName && salesName !== 'Home') {
        const option1 = new Option(salesName, salesName);
        const option2 = new Option(salesName, salesName);
        salesSelect.add(option1);
        editSalesSelect.add(option2);
      }
    });
    
  } catch (error) {
    ErrorHandler.handleError(error, 'populateSalesDropdown');
  }
};

async function handleAddCustomerSubmit(e) {
  e.preventDefault();

  if (!googleSheetsCRUD) {
    ModalHandler.show('Error', 'Google Sheets CRUD belum diinisialisasi. Silakan refresh halaman.');
    return;
  }
  
  try {
    const formData = new FormData(e.target);
    const customerData = Object.fromEntries(formData.entries());

    if (!customerData.nama || !customerData.no_telepon || !customerData.alamat || !customerData.odp_terdekat || !customerData.nama_sales) {
      ModalHandler.show('Error', 'Mohon lengkapi semua field yang wajib diisi');
      return;
    }
    
    googleSheetsCRUD.validateCustomerData(customerData);
    
    const saveBtn = document.getElementById('saveCustomer');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    saveBtn.disabled = true;
    
    const customerDataForSheets = {
        odp_terdekat: customerData.odp_terdekat || '',
        nama: customerData.nama || '',
        alamat: customerData.alamat || '',
        no_telepon: customerData.no_telepon || '',
        nama_sales: customerData.nama_sales || '',
        visit: customerData.visit || 'Not Visited',
        status: customerData.status || 'Baru',
        keterangan_tambahan: customerData.keterangan || ''
    };
    
    await googleSheetsCRUD.addCustomer(customerDataForSheets);
    
    NotificationHandler.show('Calon pelanggan berhasil ditambahkan!', 'success');
    
    resetAddCustomerForm();
    const addCustomerSection = document.getElementById('add-customer-section');
    if (addCustomerSection) {
      addCustomerSection.style.display = 'none';
    }
    
    safeRefreshData();
    
  } catch (error) {
    ErrorHandler.handleError(error, 'handleAddCustomerSubmit');
  } finally {
    const saveBtn = document.getElementById('saveCustomer');
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Calon Pelanggan';
    saveBtn.disabled = false;
  }
};

function resetAddCustomerForm() {
  try {
    const form = document.getElementById('addCustomerForm');
    if (form) {
      form.reset();
    }
    
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.classList.remove('error');
    });
    
  } catch (error) {
    ErrorHandler.handleError(error, 'resetAddCustomerForm');
  }
};

function setupRefreshDataOverride() {
  if (typeof googleSheetsIntegration !== 'undefined' && googleSheetsIntegration.refreshData) {
    const originalRefreshData = googleSheetsIntegration.refreshData;
    googleSheetsIntegration.refreshData = function() {
      originalRefreshData.call(this).then(() => {
        populateSalesDropdown();
      });
    };
  } else {
    setTimeout(setupRefreshDataOverride, 100);
  }
};

document.addEventListener('DOMContentLoaded', setupRefreshDataOverride);

function signOut() {
    handleSignoutClick();
}

function displayCurrentDate() {
  const dateElement = document.getElementById('current-date');
  if (dateElement) {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateElement.textContent = today.toLocaleDateString('id-ID', options);
  }
}

function updateWelcomeMessage(userName) {
    const placeholder = document.getElementById('user-name-placeholder');
    if (placeholder && userName) {
        const firstName = userName.split(' ')[0];
        placeholder.textContent = firstName;
    }
}

document.addEventListener('DOMContentLoaded', displayCurrentDate);

function renderSalesPerformanceChart() {
    /* if (typeof googleSheetsIntegration === 'undefined' || !googleSheetsIntegration.monitoringDataBySales) {
        return;
    }

    const selectedSales = googleSheetsIntegration.currentSalesFilter;

    if (selectedSales && selectedSales !== 'Home') {
        renderSingleSalesChart(selectedSales);
    } else {
        renderAllSalesChart();
    } */
}

function renderAllSalesChart() {
    /* const chartTitle = document.getElementById('chart-title');
    if (chartTitle) {
        chartTitle.textContent = 'Jumlah Pelanggan Per Sales';
    }
    const currentTeam = googleSheetsIntegration.currentTeam;
    const nonTeldaSales = googleSheetsIntegration.nonTeldaSales.map(s => s.toLowerCase());

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    const salesPerformance = {};
    for (const salesName in googleSheetsIntegration.monitoringDataBySales) {
        const isNonTelda = nonTeldaSales.includes(salesName.toLowerCase());

        if ((currentTeam === 'telda' && !isNonTelda) || (currentTeam === 'non-telda' && isNonTelda)) {
            const customers = googleSheetsIntegration.monitoringDataBySales[salesName];
            salesPerformance[salesName] = {
                customers: customers,
                totalCustomers: customers.length
            };
        }
    }

    const salesNames = Object.keys(salesPerformance);
    const salesData = salesNames.map(name => ({
        name: capitalizeFirstLetter(name),
        totalCustomers: salesPerformance[name].totalCustomers
    })).sort((a, b) => b.totalCustomers - a.totalCustomers);

    const chartLabels = salesData.map(s => s.name);
    const chartData = salesData.map(s => s.totalCustomers);

    const ctx = document.getElementById('salesPerformanceChart').getContext('2d');
    if (salesPerformanceChart) {
        salesPerformanceChart.destroy();
    }

    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#d9363e';
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, primaryColor);
    gradient.addColorStop(1, '#ff7e5f');

    salesPerformanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Jumlah Pelanggan',
                data: chartData,
                backgroundColor: gradient,
                borderRadius: 4,
                borderWidth: 0
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
    document.querySelector('.chart-section').style.display = 'block'; */
}

function renderSingleSalesChart(salesName) {
    /* const chartTitle = document.getElementById('chart-title');
    if (chartTitle) {
        chartTitle.textContent = `Akuisisi Pelanggan Bulanan: ${salesName}`;
    }
    const salesData = googleSheetsIntegration.monitoringDataBySales[salesName.toLowerCase()];
    if (!salesData) return;

    const headers = googleSheetsIntegration.monitoringDataHeadersBySales[salesName.toLowerCase()];
    if (!headers) {
        return;
    }

    const billingColumns = headers.filter(h => h.toLowerCase().startsWith('billing '));

    const parseBillingMonth = (billingHeader) => {
        const parts = billingHeader.split(' ');
        if (parts.length < 3) return null;
        const monthName = parts[1];
        const year = `20${parts[2]}`;
        const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].findIndex(m => m.toLowerCase() === monthName.toLowerCase());
        if (monthIndex === -1) return null;
        return new Date(year, monthIndex, 1);
    };

    billingColumns.sort((a, b) => {
        const dateA = parseBillingMonth(a);
        const dateB = parseBillingMonth(b);
        return (dateA && dateB) ? dateA - dateB : 0;
    });

    const monthlyAcquisitions = {};
    salesData.forEach(customer => {
        for (const col of billingColumns) {
            if (customer[col]) {
                const acquisitionDate = parseBillingMonth(col);
                if (acquisitionDate) {
                    const monthYear = acquisitionDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
                    monthlyAcquisitions[monthYear] = (monthlyAcquisitions[monthYear] || 0) + 1;
                    break; 
                }
            }
        }
    });

    const sortedMonths = Object.keys(monthlyAcquisitions).sort((a, b) => {
        const [m1, y1] = a.split(' ');
        const [m2, y2] = b.split(' ');
        const dateA = new Date(y1, ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].findIndex(m => m === m1));
        const dateB = new Date(y2, ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].findIndex(m => m === m2));
        return dateA - dateB;
    });

    const chartLabels = sortedMonths;
    const chartData = sortedMonths.map(month => monthlyAcquisitions[month]);

    const ctx = document.getElementById('salesPerformanceChart').getContext('2d');
    if (salesPerformanceChart) {
        salesPerformanceChart.destroy();
    }

    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
    const primaryDarkColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-dark').trim();
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, primaryColor);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');

    salesPerformanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Akuisisi per Bulan',
                data: chartData,
                backgroundColor: gradient,
                borderColor: primaryColor,
                borderWidth: 2,
                borderRadius: 8,
                hoverBackgroundColor: primaryDarkColor,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            transitions: {
                active: {
                    animation: {
                        duration: 200
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: '#111',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderRadius: 10,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return ` ${context.parsed.y} pelanggan baru`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        drawBorder: false,
                    },
                    ticks: {
                        stepSize: 1
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutBounce'
            }
        }
    }); */
}

function setupTabNavigation() {
    const tabContainer = document.querySelector('.tab-navigation');
    const contentGrid = document.querySelector('.content-grid');
    const monitoringSection = document.getElementById('monthlyMonitoringSection');
    const salesSummarySection = document.getElementById('salesSummarySection');

    if (!tabContainer || !contentGrid || !monitoringSection || !salesSummarySection) {
        return; 
    }

    tabContainer.style.display = 'none';

    window.switchToTab = (tabName) => {
        if (!tabContainer.querySelector(`[data-tab="${tabName}"]`)) return;

        tabContainer.querySelectorAll('.tab-link').forEach(link => {
            link.classList.toggle('active', link.dataset.tab === tabName);
        });

        const chartSection = document.querySelector('.chart-section');

        if (tabName === 'pelanggan') {
            contentGrid.style.display = 'block';
            monitoringSection.style.display = 'none';
            salesSummarySection.style.display = 'none';
            if (chartSection) chartSection.style.display = 'none';
        } else if (tabName === 'monitoring') {
            contentGrid.style.display = 'none';
            monitoringSection.style.display = 'block';
            salesSummarySection.style.display = 'block';
            if (chartSection) chartSection.style.display = 'block';
        }
    };

    tabContainer.addEventListener('click', (e) => {
        const target = e.target.closest('.tab-link');
        if (target && target.dataset.tab) {
            window.switchToTab(target.dataset.tab);
        }
    });

    window.switchToTab('pelanggan');
}

document.addEventListener('DOMContentLoaded', setupTabNavigation);
