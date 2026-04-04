function AdminPasswordsPage() {
  return (
    <div className="card" data-testid="admin-passwords-page">
      <div className="border-l-4 p-4 mb-6" style={{ borderLeftColor: 'var(--danger)', background: '#FEF2F2' }}>
        <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>
          SECURITY WARNING: This vault contains sensitive credentials. Access is logged.
        </p>
      </div>
      <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
        Password Vault
      </h2>
      <p style={{ color: 'var(--text-secondary)' }}>Password management coming soon...</p>
    </div>
  );
}

export default AdminPasswordsPage;
