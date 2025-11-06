'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './dashboard.module.css';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
  isBanned?: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  adminUsers: number;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    bannedUsers: 0,
    adminUsers: 0,
  });
  const router = useRouter();

  useEffect(() => {
    const checkAdminAndLoadUsers = async () => {
      try {
        // Check if user is admin
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          router.push('/login');
          return;
        }

        const user = JSON.parse(userStr);
        if (user.role !== 'admin') {
          router.push('/');
          return;
        }

        // Fetch users with auth header
        const response = await fetch('/api/admin/users', {
          headers: {
            'Authorization': `Bearer ${user.email}`,
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch users');
        }

        const data = await response.json();
        // Ensure all users have required fields with default values
        const processedUsers = data.users.map((user: any) => ({
          _id: user._id || '',
          name: user.name || '',
          email: user.email || '',
          role: user.role || 'student',
          isVerified: user.isVerified || false,
          isBanned: user.isBanned || false,
          createdAt: user.createdAt || '',
          lastLogin: user.lastLogin || ''
        }));
        setUsers(processedUsers);
        setFilteredUsers(processedUsers);
        
        // Calculate stats
        const statsData: DashboardStats = {
          totalUsers: processedUsers.length,
          activeUsers: processedUsers.filter((u: User) => !u.isBanned).length,
          bannedUsers: processedUsers.filter((u: User) => u.isBanned).length,
          adminUsers: processedUsers.filter((u: User) => u.role === 'admin').length,
        };
        setStats(statsData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndLoadUsers();
  }, [router]);

  useEffect(() => {
    // Apply filters
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(user => user.role === filterRole);
    }

    // Status filter
    if (filterStatus === 'active') {
      filtered = filtered.filter(user => !user.isBanned);
    } else if (filterStatus === 'banned') {
      filtered = filtered.filter(user => user.isBanned);
    }

    setFilteredUsers(filtered);
  }, [searchTerm, filterRole, filterStatus, users]);

  const handleBanUser = async (userId: string, isBanned: boolean) => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        throw new Error('Not authenticated');
      }
      const user = JSON.parse(userStr);

      const response = await fetch('/api/admin/users/ban', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.email}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, isBanned }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user status');
      }

      // Update local state
      setUsers(users.map(user => 
        user._id === userId ? { ...user, isBanned } : user
      ));
      
      // Update stats
      const updatedUsers = users.map(user => 
        user._id === userId ? { ...user, isBanned } : user
      );
      setStats({
        totalUsers: updatedUsers.length,
        activeUsers: updatedUsers.filter(u => !u.isBanned).length,
        bannedUsers: updatedUsers.filter(u => u.isBanned).length,
        adminUsers: updatedUsers.filter(u => u.role === 'admin').length,
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorCard}>
          <svg className={styles.errorIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className={styles.errorTitle}>Error</h2>
          <p className={styles.errorMessage}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.contentWrapper}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <p className={styles.subtitle}>Manage users and monitor system statistics</p>
        </div>

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          {/* Total Users */}
          <div className={`${styles.statCard} ${styles.blue}`}>
            <div className={styles.statContent}>
              <div className={styles.statInfo}>
                <h3>{stats.totalUsers}</h3>
                <p>Total Users</p>
              </div>
              <div className={styles.statIcon}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Active Users */}
          <div className={`${styles.statCard} ${styles.green}`}>
            <div className={styles.statContent}>
              <div className={styles.statInfo}>
                <h3>{stats.activeUsers}</h3>
                <p>Active Users</p>
              </div>
              <div className={styles.statIcon}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Banned Users */}
          <div className={`${styles.statCard} ${styles.red}`}>
            <div className={styles.statContent}>
              <div className={styles.statInfo}>
                <h3>{stats.bannedUsers}</h3>
                <p>Banned Users</p>
              </div>
              <div className={styles.statIcon}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
            </div>
          </div>

          {/* Admin Users */}
          <div className={`${styles.statCard} ${styles.purple}`}>
            <div className={styles.statContent}>
              <div className={styles.statInfo}>
                <h3>{stats.adminUsers}</h3>
                <p>Administrators</p>
              </div>
              <div className={styles.statIcon}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filterCard}>
          <div className={styles.filterGrid}>
            {/* Search */}
            <div className={styles.filterGroup}>
              <label>Search Users</label>
              <div className={styles.searchWrapper}>
                <svg className={styles.searchIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
            </div>

            {/* Role Filter */}
            <div className={styles.filterGroup}>
              <label>Filter by Role</label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="admin">Administrators</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className={styles.filterGroup}>
              <label>Filter by Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="banned">Banned</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className={styles.emptyState}>
                        <svg className={styles.emptyIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className={styles.emptyTitle}>No users found</p>
                        <p className={styles.emptyText}>Try adjusting your filters or search term</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user._id}>
                      <td>
                        <div className={styles.userCell}>
                          <div className={styles.userAvatar}>
                            {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <div className={styles.userName}>{user.name || 'Unnamed User'}</div>
                            <div className={styles.userId}>#{user._id.slice(-8)}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.emailCell}>
                          <svg className={styles.emailIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className={styles.emailText}>{user.email || 'No email'}</span>
                        </div>
                      </td>
                      <td>
                        {user.role === 'admin' ? (
                          <span className={`${styles.badge} ${styles.badgeAdmin}`}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Administrator
                          </span>
                        ) : (
                          <span className={`${styles.badge} ${styles.badgeStudent}`}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Student
                          </span>
                        )}
                      </td>
                      <td>
                        {user.isBanned ? (
                          <span className={`${styles.badge} ${styles.badgeBanned}`}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            Banned
                          </span>
                        ) : (
                          <span className={`${styles.badge} ${styles.badgeActive}`}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Active
                          </span>
                        )}
                      </td>
                      <td>
                        <div className={styles.dateCell}>
                          <svg className={styles.dateIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          }) : 'Unknown'}
                        </div>
                      </td>
                      <td>
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => handleBanUser(user._id, !user.isBanned)}
                            className={`${styles.actionBtn} ${user.isBanned ? styles.btnUnban : styles.btnBan}`}
                          >
                            {user.isBanned ? (
                              <>
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Unban</span>
                              </>
                            ) : (
                              <>
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                                <span>Ban</span>
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Results Count */}
          {filteredUsers.length > 0 && (
            <div className={styles.resultsFooter}>
              <p className={styles.resultsText}>
                Showing <span className={styles.resultsCount}>{filteredUsers.length}</span> of{' '}
                <span className={styles.resultsCount}>{users.length}</span> users
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
