'use client';

import React, { useState } from 'react';
import type {
  TeamMember,
  AddTeamMemberData,
  UpdateTeamMemberData,
} from '@/types/company';

export interface EmployeeListProps {
  members: TeamMember[];
  loading: boolean;
  error: string | null;
  onAdd: (data: AddTeamMemberData) => Promise<void>;
  onUpdate: (id: string, data: UpdateTeamMemberData) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  className?: string;
}

export default function EmployeeList({
  members,
  loading,
  error,
  onAdd,
  onUpdate,
  onRemove,
  onRefresh,
  className = '',
}: EmployeeListProps) {
  const [showForm, setShowForm] = useState(false);
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(
    null
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<UpdateTeamMemberData>({});
  const [formData, setFormData] = useState<AddTeamMemberData>({
    name: '',
    email: '',
    role_title: '',
    start_date: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: AddTeamMemberData = {
      name: formData.name,
      email: formData.email,
    };
    if (formData.role_title) {
      payload.role_title = formData.role_title;
    }
    if (formData.start_date) {
      payload.start_date = formData.start_date;
    }
    await onAdd(payload);
    setFormData({ name: '', email: '', role_title: '', start_date: '' });
    setShowForm(false);
  };

  const handleEditClick = (member: TeamMember) => {
    setConfirmingRemoveId(null);
    setEditingId(member.id);
    setEditData({
      name: member.name,
      email: member.email,
      role_title: member.role_title ?? '',
      start_date: member.start_date ?? '',
    });
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    const member = members.find((m) => m.id === editingId);
    if (!member) return;

    // Only send fields that actually changed
    const changes: UpdateTeamMemberData = {};
    if (editData.name !== undefined && editData.name !== member.name) {
      changes.name = editData.name;
    }
    if (editData.email !== undefined && editData.email !== member.email) {
      changes.email = editData.email;
    }
    const newRole = editData.role_title || null;
    if (newRole !== (member.role_title ?? null)) {
      changes.role_title = newRole;
    }
    const newDate = editData.start_date || null;
    if (newDate !== (member.start_date ?? null)) {
      changes.start_date = newDate;
    }

    if (Object.keys(changes).length > 0) {
      await onUpdate(editingId, changes);
    }
    setEditingId(null);
    setEditData({});
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleRemoveClick = (id: string) => {
    setEditingId(null);
    setConfirmingRemoveId(id);
  };

  const handleConfirmRemove = async () => {
    if (confirmingRemoveId) {
      await onRemove(confirmingRemoveId);
      setConfirmingRemoveId(null);
    }
  };

  const handleCancelRemove = () => {
    setConfirmingRemoveId(null);
  };

  if (loading) {
    return (
      <div className={`flex justify-center py-12 ${className}`}>
        <span
          className="loading loading-spinner loading-lg"
          role="status"
          aria-label="Loading team members"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`alert alert-error ${className}`} role="alert">
        <span>{error}</span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="btn btn-sm btn-ghost min-h-11 min-w-11"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-base-content/70 text-sm" aria-live="polite">
          {members.length} member{members.length !== 1 ? 's' : ''}
        </p>
        <button
          className="btn btn-primary btn-sm min-h-11"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : 'Add Employee'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card bg-base-200 mb-4 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="form-control">
              <label htmlFor="emp-name" className="label">
                <span className="label-text">Name</span>
              </label>
              <input
                id="emp-name"
                type="text"
                required
                className="input input-bordered min-h-11"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="form-control">
              <label htmlFor="emp-email" className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                id="emp-email"
                type="email"
                required
                className="input input-bordered min-h-11"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>
            <div className="form-control">
              <label htmlFor="emp-role" className="label">
                <span className="label-text">Role / Title</span>
              </label>
              <input
                id="emp-role"
                type="text"
                className="input input-bordered min-h-11"
                value={formData.role_title}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    role_title: e.target.value,
                  }))
                }
              />
            </div>
            <div className="form-control">
              <label htmlFor="emp-start" className="label">
                <span className="label-text">Start Date</span>
              </label>
              <input
                id="emp-start"
                type="date"
                className="input input-bordered min-h-11"
                value={formData.start_date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    start_date: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button type="submit" className="btn btn-primary btn-sm min-h-11">
              Save
            </button>
          </div>
        </form>
      )}

      {members.length === 0 ? (
        <div className="text-base-content/50 py-12 text-center">
          <p>No team members yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Start Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  {editingId === member.id ? (
                    <>
                      <td>
                        <input
                          type="text"
                          required
                          className="input input-bordered input-sm min-h-11 w-full"
                          aria-label="Edit name"
                          value={editData.name ?? ''}
                          onChange={(e) =>
                            setEditData((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="email"
                          required
                          className="input input-bordered input-sm min-h-11 w-full"
                          aria-label="Edit email"
                          value={editData.email ?? ''}
                          onChange={(e) =>
                            setEditData((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="input input-bordered input-sm min-h-11 w-full"
                          aria-label="Edit role"
                          value={editData.role_title ?? ''}
                          onChange={(e) =>
                            setEditData((prev) => ({
                              ...prev,
                              role_title: e.target.value,
                            }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          className="input input-bordered input-sm min-h-11 w-full"
                          aria-label="Edit start date"
                          value={editData.start_date ?? ''}
                          onChange={(e) =>
                            setEditData((prev) => ({
                              ...prev,
                              start_date: e.target.value,
                            }))
                          }
                        />
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button
                            className="btn btn-primary btn-xs min-h-11 min-w-11"
                            onClick={handleEditSave}
                          >
                            Save
                          </button>
                          <button
                            className="btn btn-ghost btn-xs min-h-11 min-w-11"
                            onClick={handleEditCancel}
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{member.name}</td>
                      <td>{member.email}</td>
                      <td>{member.role_title ?? ''}</td>
                      <td>{member.start_date ?? ''}</td>
                      <td>
                        {confirmingRemoveId === member.id ? (
                          <div className="flex gap-1">
                            <button
                              className="btn btn-error btn-xs min-h-11 min-w-11"
                              onClick={handleConfirmRemove}
                            >
                              Confirm
                            </button>
                            <button
                              className="btn btn-ghost btn-xs min-h-11 min-w-11"
                              onClick={handleCancelRemove}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              className="btn btn-ghost btn-xs min-h-11 min-w-11"
                              aria-label={`Edit ${member.name}`}
                              onClick={() => handleEditClick(member)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-ghost btn-xs min-h-11 min-w-11"
                              aria-label={`Remove ${member.name}`}
                              onClick={() => handleRemoveClick(member.id)}
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
