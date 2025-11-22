document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessageDiv = document.getElementById('errorMessage');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Mencegah form dari refresh halaman

        // Sembunyikan pesan error sebelumnya
        errorMessageDiv.style.display = 'none';
        errorMessageDiv.textContent = '';

        const username = loginForm.username.value;
        const password = loginForm.password.value;

        try {
            const response = await fetch('/api?action=login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // Jika login berhasil (status 200-299)
                console.log('Login berhasil, token diterima:', data.token);
                // Simpan token di localStorage untuk digunakan di seluruh sesi
                localStorage.setItem('adminToken', data.token);
                
                // Arahkan ke halaman utama admin
                // Ganti 'Internal.html' jika halaman utama Anda berbeda
                window.location.href = 'Internal.html'; 
            } else {
                // Jika login gagal (status 401, 400, dll)
                errorMessageDiv.textContent = data.message || 'Terjadi kesalahan.';
                errorMessageDiv.style.display = 'block';
            }
        } catch (error) {
            console.error('Error saat proses login:', error);
            errorMessageDiv.textContent = 'Tidak dapat terhubung ke server. Periksa koneksi Anda.';
            errorMessageDiv.style.display = 'block';
        }
    });
});
