import React from 'react';
import { StatCard, Card, BarChart } from '../../components/ui';

const Analytics = () => (
  <div className="page fade-in">
    <div className="page-header">
      <h2>Report Analytics</h2>
      <p>Insights across all cinema rooms and user activity.</p>
    </div>

    <div className="stats-grid">
      <StatCard icon="🎬" value="6"           label="Movies in System"  trend="2 added this month"       trendUp delay={1} />
      <StatCard icon="🏟️" value="4"           label="Cinema Rooms"      trend="1 new room"               trendUp delay={2} />
      <StatCard icon="🎟️" value="8,420"       label="Total Tickets"     trend="23.1% vs last month"      trendUp delay={3} />
      <StatCard icon="💰" value="RM 63,150"   label="Monthly Revenue"   trend="18.4% growth"             trendUp delay={4} />
    </div>

    <div className="two-col">
      <Card title="Movie Popularity (tickets sold)">
        <div className="card-body">
          <BarChart data={[
            { label: 'Golden Horizon',       value: 2100 },
            { label: 'Starfall Chronicles',  value: 1850 },
            { label: 'Neon Requiem',         value: 1600 },
            { label: 'The Last Ember',       value: 1200 },
            { label: 'Echo Chamber',         value: 980  },
            { label: 'Whispers in the Dark', value: 690  },
          ]} />
        </div>
      </Card>
      <Card title="Room Activity (bookings)">
        <div className="card-body">
          <BarChart data={[
            { label: 'Galaxy Hall',    value: 3200 },
            { label: 'Eclipse Hall',   value: 2600 },
            { label: 'Aurora Theatre', value: 1900 },
            { label: 'Nebula Screen',  value: 720  },
          ]} />
        </div>
      </Card>
    </div>

    <Card title="Genre Breakdown">
      <div className="card-body">
        <BarChart data={[
          { label: 'Adventure', value: 2100 },
          { label: 'Sci-Fi',    value: 1850 },
          { label: 'Thriller',  value: 1600 },
          { label: 'Drama',     value: 1200 },
          { label: 'Comedy',    value: 980  },
          { label: 'Horror',    value: 690  },
        ]} />
      </div>
    </Card>
  </div>
);

export default Analytics;
