import React from 'react';
import Card from '../../../components/ui/Card';
import Table from '../../../components/ui/Table';

const EmployerApplicationsPanel = ({ applications, loading, columns, isDashboardView }) => {
  return (
    <div className={isDashboardView ? 'lg:col-span-2' : ''}>
      <Card title="Applications Pipelines Tracking">
        <Table
          columns={columns}
          data={applications}
          loading={loading}
          emptyMessage="No candidate has applied to your listings yet."
        />
      </Card>
    </div>
  );
};

export default EmployerApplicationsPanel;