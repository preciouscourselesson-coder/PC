import React from 'react';
import { C } from './manage-user/constants';

import useUsers from './manage-user/hooks/useUsers';
import useToast from './manage-user/hooks/useToast';
import useUserFilters from './manage-user/hooks/useUserFilters';
import useMapelDropdown from './manage-user/hooks/useMapelDropdown';
import useUserActions from './manage-user/hooks/useUserActions';
import useAddUserForm from './manage-user/hooks/useAddUserForm';
import useImportExport from './manage-user/hooks/useImportExport';

import Toast from './manage-user/components/Toast';
import ErrorBanner from './manage-user/components/ErrorBanner';
import Toolbar from './manage-user/components/Toolbar';
import FiltersBar from './manage-user/components/FiltersBar';
import UsersTable from './manage-user/components/UsersTable';
import DeleteConfirmModal from './manage-user/components/DeleteConfirmModal';
import AddUserModal from './manage-user/components/AddUserModal';

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
