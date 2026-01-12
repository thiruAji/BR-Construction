import React, { useState } from 'react';
import SiteCosts from './SiteCosts';
import SitePlanSaver from './SitePlanSaver';
import ClientPayments from './ClientPayments';
import { Icons } from './Icons';
import '../index.css';

const SiteDetail = ({ site, onBack, user, isCEO }) => {
    const [activeTab, setActiveTab] = useState('expenses'); // 'expenses' | 'plans' | 'payments'

    return (
        <div className="site-detail-container">
            {/* Top Navigation / Tab Bar */}
            <div className="sticky-header" style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                <div className="container">
                    <div className="flex-between py-md">
                        <div className="flex gap-md align-center">
                            <button onClick={onBack} className="btn btn-secondary btn-small" style={{ padding: '8px' }}>
                                <Icons.Back size={18} />
                            </button>
                            <div>
                                <h3 style={{ margin: 0 }}>{site.name}</h3>
                                <p className="text-secondary" style={{ fontSize: '0.75rem', margin: 0 }}>{site.location}</p>
                            </div>
                        </div>

                        <div className="flex gap-sm bg-secondary p-xs" style={{ borderRadius: '8px', background: 'rgba(0,0,0,0.05)', padding: '4px' }}>
                            <button
                                onClick={() => setActiveTab('expenses')}
                                className={`btn btn-small ${activeTab === 'expenses' ? 'btn-primary' : ''}`}
                                style={{ border: 'none', boxShadow: activeTab === 'expenses' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}
                            >
                                <Icons.List size={16} /> Daily Expense
                            </button>
                            <button
                                onClick={() => setActiveTab('plans')}
                                className={`btn btn-small ${activeTab === 'plans' ? 'btn-primary' : ''}`}
                                style={{ border: 'none', boxShadow: activeTab === 'plans' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}
                            >
                                <Icons.File size={16} /> Site Plan Saver
                            </button>
                            <button
                                onClick={() => setActiveTab('payments')}
                                className={`btn btn-small ${activeTab === 'payments' ? 'btn-primary' : ''}`}
                                style={{ border: 'none', boxShadow: activeTab === 'payments' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}
                            >
                                <Icons.Money size={16} /> Client Payments
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container">
                {activeTab === 'expenses' && (
                    <div className="fade-in">
                        <SiteCosts
                            site={site}
                            onBack={onBack}
                            user={user}
                            isCEO={isCEO}
                            hideHeader={true}
                        />
                    </div>
                )}
                {activeTab === 'plans' && (
                    <div className="fade-in">
                        <SitePlanSaver
                            site={site}
                            user={user}
                            isCEO={isCEO}
                        />
                    </div>
                )}
                {activeTab === 'payments' && (
                    <div className="fade-in">
                        <ClientPayments
                            site={site}
                            user={user}
                            isCEO={isCEO}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(SiteDetail);
