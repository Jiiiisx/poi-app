const CLIENT_ID = '167078370634-de0ou8c3hikdba9pq6evimmfekbkk9o6.apps.googleusercontent.com';
let salesPerformanceChart = null;

// Simple Error Handler
const ErrorHandler = {
  log: console.log,
  handleError: (error, context) => {
    console.error(`ERROR in ${context}:`, error);
  }
};

function initializeGsi() {
  google.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: handleCredentialResponse
  });
  google.accounts.id.renderButton(
    document.getElementById('g_id_onload'),
    { theme: 'outline', size: 'large' }  // customization attributes
  );
  google.accounts.id.prompt(); // also display the One Tap dialog
}



window.handleCredentialResponse = function(response) {
  console.log('handleCredentialResponse called');
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
          localStorage.setItem('pendingUserInfo', JSON.stringify(userInfo));
          window.location.reload(); // Reload the page to ensure scripts load in order
      } else {
          throw new Error("Failed to decode user credential");
      }
    } else {
      throw new Error("No credential in response");
    }
  } catch (error) {
    console.error('Error in handleCredentialResponse:', error);
    updateSigninStatus(false);
  }
};

document.addEventListener('DOMContentLoaded', () => {
    const pendingUserInfo = localStorage.getItem('pendingUserInfo');

    if (pendingUserInfo) {
        localStorage.removeItem('pendingUserInfo');
        const userInfo = JSON.parse(pendingUserInfo);
        
        currentIdToken = userInfo.token;
        currentUserEmail = userInfo.email;
        window.currentUserEmail = currentUserEmail;

        document.addEventListener('googleSheetsIntegrationReady', () => {
            console.log('googleSheetsIntegration is ready, proceeding with sign-in status update.');
            updateSigninStatus(true, userInfo.name, userInfo.picture);
        });
    }
});




// Function untuk mendapatkan email user dari Google login
function getUserEmailFromToken(token) {
    try {
        if (!token) return '';
        
        // Decode JWT token untuk mendapatkan email
        const payload = token.split('.')[1];
        const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        const payloadObj = JSON.parse(decodedPayload);
        
        return payloadObj; 
    } catch (error) {
        console.error('Error decoding token:', error);
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

// Add event listener for manual sign-in button
document.addEventListener('DOMContentLoaded', () => {
  const manualSignInBtn = document.getElementById('manualSignInBtn');
  if (manualSignInBtn) {
    manualSignInBtn.addEventListener('click', async () => {
      try {
        console.log('Manual sign-in button clicked');
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
          console.log('Requesting access token with manual consent...');
          
          // Set up callback for manual sign-in
          tokenClient.callback = (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              gapi.client.setToken(tokenResponse);
              currentAccessToken = tokenResponse.access_token;
              console.log('Manual sign-in successful');
              
              // Update UI
              if (authInfo) {
                authInfo.textContent = 'Sign-in berhasil! Memuat dashboard...';
                authInfo.style.color = '#28a745';
              }
              
              // Trigger data loading
              if (window.googleSheetsIntegration) {
                window.googleSheetsIntegration.setup();
              }
            } else {
              console.error('Manual sign-in failed:', tokenResponse);
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
            console.error('Manual sign-in error:', error);
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
          console.error('Token client not initialized');
          if (authError) {
            authError.textContent = 'Authentication service not ready. Please refresh the page.';
            authError.style.display = 'block';
          }
        }
      } catch (error) {
        console.error('Manual sign-in error:', error);
        const authError = document.getElementById('authError');
        if (authError) {
          authError.textContent = 'Sign-in failed. Please try again.';
          authError.style.display = 'block';
        }
      }
    });
  }

  // Check network speed
  checkNetworkSpeed();
});

function handleSignoutClick() {
  try {
    console.log('handleSignoutClick called');
    if (typeof google !== 'undefined' && typeof google.accounts !== 'undefined' && typeof google.accounts.id !== 'undefined') {
      console.log('google.accounts.id is defined. Attempting disableAutoSelect.');
      google.accounts.id.disableAutoSelect();
    } else {
      console.log('google.accounts.id is NOT defined. Skipping disableAutoSelect.');
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
      const MIN_LOADING_TIME = 2000; 
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
      
      document.addEventListener('googleSheetsIntegrationReady', () => {
          if (window.googleSheetsIntegration) {
              window.googleSheetsIntegration.setup().then(() => {
                console.log('Dashboard initialized successfully');
                renderSalesPerformanceChart();
                const elapsedTime = Date.now() - startTime;
                const timeToWait = Math.max(0, MIN_LOADING_TIME - elapsedTime);

                setTimeout(() => {
                    if (skeletonLoader) {
                        skeletonLoader.style.display = 'none';
                    }
                    mainContent.style.display = 'block';
                    if (typeof playDashboardEntranceAnimation === 'function') {
                        playDashboardEntranceAnimation();
                    }
                }, timeToWait);
              }).catch(error => {
                  console.error('Dashboard display error:', error);
                  if (skeletonLoader) {
                      skeletonLoader.style.display = 'none';
                  }
                  mainContent.style.display = 'block';
              });
          }
      });
      
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




// Safe wrapper for googleSheetsIntegration.refreshData
function safeRefreshData() {
  if (typeof googleSheetsIntegration !== 'undefined' && googleSheetsIntegration.refreshData) {
    googleSheetsIntegration.refreshData();
  } else {
    console.warn('googleSheetsIntegration not ready, retrying...');
    setTimeout(safeRefreshData, 500);
  }
};

// Global functions with error handling

function closeEditModal() {
  try {
    const editModal = document.getElementById('editModal');
    if (editModal) {
      editModal.style.display = 'none';
      editModal.classList.remove('show');
      
      // Reset form when closing
      const editForm = document.getElementById('editForm');
      if (editForm) {
        editForm.reset();
      }
      
      // Clear any error messages
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
      
      // Clear any error messages
      const historyError = document.getElementById('historyError');
      if (historyError) {
        historyError.style.display = 'none';
      }
      // Clear table body
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
    
    // Prevent white screen by ensuring elements exist
    const requiredElements = ['sign-in-container', 'main-content', 'errorDisplay'];
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
      ErrorHandler.log(`Missing elements: ${missingElements.join(', ')}`);
      return;
    }
    
    // Check login status
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    ErrorHandler.log(`Login status: ${isLoggedIn}`);
    
    if (isLoggedIn) {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      if (userInfo) {
        currentUserEmail = userInfo.email;
        updateSigninStatus(true, userInfo.name, userInfo.picture);
      }
    }
    
    // Initialize UI components
    initializeUIComponents();

    // Check network speed
    checkNetworkSpeed();

    // Accordion functionality for customer cards
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

    // Add event listener for government data filter button to switch view
    const govFilterBtn = document.getElementById('btnTableShowGoverment');
    const allFilterBtn = document.getElementById('btnTableShowAll');
    const schoolFilterBtn = document.getElementById('btnTableShowSchool');
    const nonSchoolFilterBtn = document.getElementById('btnTableShowNonSchool');

    // Dashboard Tutorial Modal Logic
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
          window.googleSheetsIntegration.governmentCurrentPage = 1; // Reset to first page if needed
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
    
    // Sidebar toggle is now handled by SidebarManager
    // No need for duplicate initialization
    
  } catch (error) {
    ErrorHandler.handleError(error, 'DOMContentLoaded');
  }
});

function initializeUIComponents() {
  try {
    // Modal and button event listeners
    const addSalesModal = document.getElementById('addSalesModal');
    const openAddSalesBtn = document.getElementById('openAddSalesBtn');
    const closeAddSalesModal = document.getElementById('closeAddSalesModal');
    const cancelAddSalesBtn = document.getElementById('cancelAddSalesBtn');
    const editModal = document.getElementById('editModal');
    const toggleCustomerFormBtn = document.getElementById('toggle-customer-form');
    const addCustomerFormContainer = document.getElementById('add-customer-form-container');
    const overviewBtn = document.getElementById('overview-btn');

    // Shared function to toggle the form
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

    // Toggle Add Customer Form (Desktop button)
    if (toggleCustomerFormBtn) {
      toggleCustomerFormBtn.addEventListener('click', toggleForm);
    }

    // Toggle Add Customer Form with FAB (Mobile button)
    const fabAddCustomerBtn = document.getElementById('fab-add-customer');
    if (fabAddCustomerBtn) {
      fabAddCustomerBtn.addEventListener('click', toggleForm);
    }
    
    // Close form button
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
    
    // Cancel button
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
    
    // Initialize Add Customer Form
    initializeAddCustomerForm();

    // Populate sales dropdown
    populateSalesDropdown();

    // Open modal
    if (openAddSalesBtn && addSalesModal) {
      openAddSalesBtn.addEventListener('click', () => {
        addSalesModal.classList.add('show');
      });
    }

    // Close modal
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

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
      if (event.target === addSalesModal) addSalesModal.classList.remove('show');
      if (event.target === editModal) editModal.classList.remove('show');
    });

    // Close modal with ESC key
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

    // Show all data when overview is clicked
    if (overviewBtn) {
      overviewBtn.addEventListener('click', () => {
        googleSheetsIntegration.filterBySales('Home');
        document.querySelectorAll('.sales-item').forEach(i => i.classList.remove('active'));
        overviewBtn.classList.add('active');
      });
    }

    // Handle form submissions
    setupFormHandlers();
    // setupEditFormHandler(); // Commented out because function is undefined
    
  } catch (error) {
    ErrorHandler.handleError(error, 'initializeUIComponents');
  }
};

function setupFormHandlers() {
  try {
    // Handle form tambah sales
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
    document.getElementById('editTelepon').value = customerData.no_telepon || '';
    document.getElementById('editSales').value = customerData.nama_sales || '';
    document.getElementById('editVisit').value = customerData.visit || '';
    document.getElementById('editStatus').value = customerData.status || '';
    document.getElementById('originalStatus').value = customerData.status || '';
    document.getElementById('editKeteranganTambahan').value = customerData.keterangan_tambahan || '';

    // Show the edit modal
    const editModal = document.getElementById('editModal');
    if (editModal) {
      editModal.style.display = 'block';
      editModal.classList.add('show');
    }
  } catch (error) {
    ErrorHandler.handleError(error, 'populateEditModal');
  }
}

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
  // Check if this is the specific refreshData error
  if (event.message.includes('refreshData') && event.message.includes('undefined')) {
    console.warn('Caught refreshData undefined error - this is expected during initialization');
    return; // Don't show this specific error to user
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

// Listen for googleSheetsIntegration ready event
document.addEventListener('googleSheetsIntegrationReady', () => {
  console.log('googleSheetsIntegration is now ready');
  safeRefreshData();
});

// Initialize googleSheetsIntegration safely
function initializeGoogleSheetsIntegration() {
  if (typeof googleSheetsIntegration === 'undefined') {
    console.log('Waiting for googleSheetsIntegration to load...');
    setTimeout(initializeGoogleSheetsIntegration, 1000);
  } else {
    console.log('googleSheetsIntegration loaded successfully');
    // Ensure it's properly initialized
    if (googleSheetsIntegration.isInitialized) {
      safeRefreshData();
    }
  }
};

// Start initialization when DOM is ready
document.addEventListener('DOMContentLoaded', initializeGoogleSheetsIntegration);

// Sidebar toggle functionality has been moved to sidebar-manager.js
// The SidebarManager class now handles all sidebar interactions

// Add Customer Form Functions
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
    
    // Only proceed if they are select elements
    if (!salesSelect || salesSelect.tagName !== 'SELECT' || 
        !editSalesSelect || editSalesSelect.tagName !== 'SELECT') {
      return; 
    }
    
    // Clear existing options
    salesSelect.innerHTML = '<option value="">Pilih Sales</option>';
    editSalesSelect.innerHTML = '<option value="">Pilih Sales</option>';
    
    // Get sales from the sidebar
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

    // Debug log currentUserEmail
    console.log('DEBUG: currentUserEmail during add:', currentUserEmail);
    
    // Validate required fields
    if (!customerData.nama || !customerData.no_telepon || !customerData.alamat || !customerData.odp_terdekat || !customerData.nama_sales) {
      ModalHandler.show('Error', 'Mohon lengkapi semua field yang wajib diisi');
      return;
    }
    
    // Validate customer data
    googleSheetsCRUD.validateCustomerData(customerData);
    
    // Show loading
    const saveBtn = document.getElementById('saveCustomer');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    saveBtn.disabled = true;
    
    // Prepare data for Google Sheets
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
    
    // Add new customer using GoogleSheetsCRUD
    await googleSheetsCRUD.addCustomer(customerDataForSheets);
    
    // Success message
    NotificationHandler.show('Calon pelanggan berhasil ditambahkan!', 'success');
    
    // Reset form and hide
    resetAddCustomerForm();
    const addCustomerSection = document.getElementById('add-customer-section');
    if (addCustomerSection) {
      addCustomerSection.style.display = 'none';
    }
    
    // Refresh data
    safeRefreshData();
    
  } catch (error) {
    ErrorHandler.handleError(error, 'handleAddCustomerSubmit');
  } finally {
    // Reset button state
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
    
    // Reset any validation states
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.classList.remove('error');
    });
    
  } catch (error) {
    ErrorHandler.handleError(error, 'resetAddCustomerForm');
  }
};

// Update the populateSalesDropdown function to be called when sales data is loaded
// Wait for googleSheetsIntegration to be initialized before accessing it
function setupRefreshDataOverride() {
  if (typeof googleSheetsIntegration !== 'undefined' && googleSheetsIntegration.refreshData) {
    const originalRefreshData = googleSheetsIntegration.refreshData;
    googleSheetsIntegration.refreshData = function() {
      originalRefreshData.call(this).then(() => {
        populateSalesDropdown();
      });
    };
  } else {
    // Retry after a short delay
    setTimeout(setupRefreshDataOverride, 100);
  }
};

// Call the setup function when DOM is ready
document.addEventListener('DOMContentLoaded', setupRefreshDataOverride);

// Function called by the Logout button in index.html
function signOut() {
    handleSignoutClick(); // Call the existing sign out logic
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
    if (typeof googleSheetsIntegration === 'undefined' || !googleSheetsIntegration.monitoringDataBySales) {
        console.warn('Sales data not available for chart rendering.');
        return;
    }

    const selectedSales = googleSheetsIntegration.currentSalesFilter;

    if (selectedSales && selectedSales !== 'Home') {
        renderSingleSalesChart(selectedSales);
    } else {
        renderAllSalesChart();
    }
}

function renderAllSalesChart() {
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
    document.querySelector('.chart-section').style.display = 'block';
}

function renderSingleSalesChart(salesName) {
    const salesData = googleSheetsIntegration.monitoringDataBySales[salesName.toLowerCase()];
    if (!salesData) return;

    const chartContainer = document.querySelector('.chart-container');
    chartContainer.style.height = '400px';

    const headerInfo = googleSheetsIntegration.monitoringDataHeadersBySales[salesName.toLowerCase()];
    console.log('headerInfo:', headerInfo);
    if (!headerInfo || !headerInfo.headers) {
        console.error('headerInfo or headerInfo.headers is not available.');
        return;
    }

    const headers = headerInfo.headers;
    console.log('headers:', headers);
    const billingColumns = headers.filter(h => h.toLowerCase().startsWith('billing'));

    const parseBillingMonth = (billingHeader) => {
        const parts = billingHeader.split(' ');
        if (parts.length !== 3) return null;
        const monthName = parts[1];
        const year = `20${parts[2]}`;
        const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].findIndex(m => m.toLowerCase() === monthName.toLowerCase());
        if (monthIndex === -1) return null;
        return new Date(year, monthIndex, 1);
    };

    billingColumns.sort((a, b) => {
        const dateA = parseBillingMonth(a);
        const dateB = parseBillingMonth(b);
        if (!dateA || !dateB) return 0;
        return dateA - dateB;
    });

    const monthlyAcquisitions = {};
    salesData.forEach(customer => {
        for (const col of billingColumns) {
            if (customer[col]) {
                const acquisitionDate = parseBillingMonth(col);
                if (acquisitionDate) {
                    const monthYear = `${acquisitionDate.getMonth() + 1}/${acquisitionDate.getFullYear()}`;
                    monthlyAcquisitions[monthYear] = (monthlyAcquisitions[monthYear] || 0) + 1;
                    break;
                }
            }
        }
    });

    const sortedMonths = Object.keys(monthlyAcquisitions).sort((a, b) => {
        const [m1, y1] = a.split('/');
        const [m2, y2] = b.split('/');
        return new Date(y1, m1 - 1) - new Date(y2, m2 - 1);
    });

    const chartLabels = sortedMonths;
    const chartData = sortedMonths.map(month => monthlyAcquisitions[month]);

    const ctx = document.getElementById('salesPerformanceChart').getContext('2d');
    if (salesPerformanceChart) {
        salesPerformanceChart.destroy();
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(40, 167, 69, 0.6)');
    gradient.addColorStop(1, 'rgba(40, 167, 69, 0)');

    salesPerformanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Akuisisi per Bulan',
                data: chartData,
                backgroundColor: gradient,
                borderColor: '#28a745',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#28a745',
                pointHoverRadius: 7,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// --- START TAB NAVIGATION LOGIC ---
function setupTabNavigation() {
    const tabContainer = document.querySelector('.tab-navigation');
    const contentGrid = document.querySelector('.content-grid');
    const monitoringSection = document.getElementById('monthlyMonitoringSection');
    const salesSummarySection = document.getElementById('salesSummarySection');

    if (!tabContainer || !contentGrid || !monitoringSection || !salesSummarySection) {
        return; // If elements aren't here, do nothing.
    }

    // Hide tabs by default
    tabContainer.style.display = 'none';

    // Make tab switcher globally available
    window.switchToTab = (tabName) => {
        if (!tabContainer.querySelector(`[data-tab="${tabName}"]`)) return; // Exit if tab doesn't exist

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
            // Explicitly show the monitoring sections when switching to the tab
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

    // Set initial state on page load
    window.switchToTab('pelanggan');
}

document.addEventListener('DOMContentLoaded', setupTabNavigation);
// --- END TAB NAVIGATION LOGIC ---