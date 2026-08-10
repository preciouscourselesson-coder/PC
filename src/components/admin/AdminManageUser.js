import React from 'react';
import { C } from './AdminManageUser/constants';

import useUsers from './AdminManageUser/hooks/useUsers';
import useToast from './AdminManageUser/hooks/useToast';
import useUserFilters from './AdminManageUser/hooks/useUserFilters';
import useMapelDropdown from './AdminManageUser/hooks/useMapelDropdown';
import useUserActions from './AdminManageUser/hooks/useUserActions';
import useAddUserForm from './AdminManageUser/hooks/useAddUserForm';
import useImportExport from './AdminManageUser/hooks/useImportExport';

import Toast from './AdminManageUser/components/Toast';
import ErrorBanner from './AdminManageUser/components/ErrorBanner';
import Toolbar from './AdminManageUser/components/Toolbar';
import FiltersBar from './AdminManageUser/components/FiltersBar';
import UsersTable from './AdminManageUser/components/UsersTable';
import DeleteConfirmModal from './AdminManageUser/components/DeleteConfirmModal';
import AddUserModal from './AdminManageUser/components/AddUserModal';

const AdminManageUser = () => {
  const { users, setUsers, loading, error, fetchUsers } = useUsers();
  const { toast, setToast } = useToast();
  const { search, setSearch, roleFilter, setRoleFilter, statusFilter, setStatusFilter, filtered } = useUserFilters(users);
  const { mapelDropdownOpenId, setMapelDropdownOpenId, mapelDropdownRef } = useMapelDropdown();

  const importExport = useImportExport({ users, setToast, fetchUsers });
  const { importing, setImporting, fileInputRef, handleDownloadTemplate, handleExport, handleImport } = importExport;

  const actions = useUserActions({ setUsers, setToast, fetchUsers, setImporting });
  const { busyId, loginAsId, confirmDelete, setConfirmDelete, handleGenerateAllReferrals } = actions;

  const addUserForm = useAddUserForm({ setToast, fetchUsers });
  const { showAddModal, setShowAddModal, addForm, setAddForm, addSubmitting, handleAddUser } = addUserForm;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.7rem', fontWeight: 'bold', color: C.dark, margin: '0 0 6px' }}>
          Manajemen User
        </h1>
        <p style={{ color: C.gray, fontSize: '0.92rem', margin: 0, lineHeight: 1.5 }}>
          Kelola peran dan status seluruh pengguna yang terdaftar.
        </p>
      </div>

      <Toast toast={toast} />
      <ErrorBanner message={error} />

      <Toolbar
        onAddUser={() => setShowAddModal(true)}
        onDownloadTemplate={handleDownloadTemplate}
        onImportClick={() => fileInputRef.current?.click()}
        onImportFileChange={handleImport}
        onExport={handleExport}
        onGenerateAllReferrals={() => handleGenerateAllReferrals(users)}
        importing={importing}
        fileInputRef={fileInputRef}
      />

      <FiltersBar
        search={search}
        onSearchChange={setSearch}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <UsersTable
        loading={loading}
        error={error}
        filtered={filtered}
        busyId={busyId}
        loginAsId={loginAsId}
        mapelDropdownOpenId={mapelDropdownOpenId}
        mapelDropdownRef={mapelDropdownRef}
        onToggleMapelDropdown={setMapelDropdownOpenId}
        actions={actions}
      />

      <DeleteConfirmModal
        target={confirmDelete}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={actions.handleDeleteProfile}
      />

      <AddUserModal
        open={showAddModal}
        form={addForm}
        onFormChange={setAddForm}
        submitting={addSubmitting}
        onSubmit={handleAddUser}
        onCancel={() => setShowAddModal(false)}
      />
    </div>
  );
};

export default AdminManageUser;
