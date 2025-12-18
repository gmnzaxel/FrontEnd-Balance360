import React from 'react';
import clsx from '../../utils/clsx';

const Table = ({ headers, rows, renderRow, className = '' }) => (
  <div className={clsx('table-container', className)}>
    <table className="styled-table">
      {headers && (
        <thead>
          <tr>
            {headers.map((head) => (
              <th key={head}>{head}</th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {rows.map(renderRow)}
      </tbody>
    </table>
  </div>
);

export default Table;
