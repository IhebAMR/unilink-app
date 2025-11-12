# AI-Powered Carpooling Features

## Overview
This document describes the AI-based features implemented to enhance the carpooling module with intelligent route matching, ride recommendations, and compatibility scoring.

## Features Implemented

### 1. **Smart Route Matching** (`/api/ai/match-rides`)
- **Purpose**: Find the best rides that match a user's origin, destination, and time preferences
- **Algorithm**: 
  - Calculates route compatibility using Haversine distance formula
  - Analyzes route deviation (how far user's points are from the ride route)
  - Considers three match types: Exact, On-Route, and Nearby
  - Factors in time compatibility (±2 hours window)
  - Includes user compatibility scoring based on ratings
  - Considers price preferences

- **Scoring System**:
  - Route Match (40%): Based on origin/destination proximity and route alignment
  - Time Match (20%): Based on departure time similarity
  - User Compatibility (30%): Based on driver/passenger ratings and history
  - Price Match (10%): Based on price preferences

- **Usage**: 
  - Available on ride demand detail pages
  - Users can click "Find AI Matches" to get personalized ride suggestions
  - Returns top 10 matches sorted by overall compatibility score

### 2. **AI-Powered Recommendations** (`/api/ai/recommend-rides`)
- **Purpose**: Provide personalized ride recommendations based on user's travel history
- **Algorithm**:
  - Analyzes user's previous ride history to identify patterns
  - Identifies preferred travel times (most common hours)
  - Clusters common origins and destinations
  - Calculates average price preferences
  - Scores available rides based on:
    - Time preference matching
    - Route similarity to historical routes
    - Driver ratings
    - Price alignment
    - Recency (upcoming rides get bonus)

- **Usage**:
  - New "AI Recommendations" tab in the carpooling page
  - Automatically loads when user switches to the tab
  - Shows top 10 personalized recommendations

### 3. **Compatibility Scoring System**
The system uses multiple factors to calculate compatibility:

#### Route Compatibility
- **Exact Match**: Origin and destination within 0.5km
- **On-Route Match**: User's points are on or near the ride route (within 5km)
- **Nearby Match**: Points are close but not on route

#### Time Compatibility
- Considers rides within ±2 hours of requested time
- Score decreases as time difference increases

#### User Compatibility
- Based on average ratings (driver and passenger)
- Bonus for highly rated users (4.5+ stars)
- Penalty for low ratings (<3.0 stars)
- Bonus for experienced users (5+ reviews)

#### Price Compatibility
- Compares ride price with user's maximum price preference
- Bonus for rides significantly below max price
- Penalty for rides exceeding max price

## Technical Implementation

### Core Utilities (`src/app/lib/ai-matching.ts`)
- `calculateDistance()`: Haversine formula for distance calculation
- `findClosestPointOnRoute()`: Finds nearest point on route to a given location
- `calculateRouteCompatibility()`: Scores route matching
- `calculateTimeCompatibility()`: Scores time matching
- `calculateUserCompatibility()`: Scores user compatibility
- `calculatePriceCompatibility()`: Scores price matching
- `calculateOverallMatchScore()`: Combines all factors into final score

### API Endpoints

#### `POST /api/ai/match-rides`
Matches rides for a specific route request.
**Body**:
```json
{
  "origin": { "location": { "coordinates": [lng, lat] } },
  "destination": { "location": { "coordinates": [lng, lat] } },
  "dateTime": "2024-01-15T08:00:00Z",
  "maxPrice": 20,
  "seatsNeeded": 1
}
```

#### `GET /api/ai/match-rides?demandId=...`
Gets matches for an existing ride demand.

#### `GET /api/ai/recommend-rides`
Gets personalized recommendations based on user history.

### Frontend Components

#### `AIMatchCard` (`src/app/components/AIMatchCard.tsx`)
- Displays detailed match information
- Shows match score with color coding
- Displays breakdown of scoring factors
- Shows route deviation information
- Includes recommendation text

#### `AIRecommendations` (`src/app/components/AIRecommendations.tsx`)
- Displays list of recommended rides
- Shows recommendation score
- Lists match reasons
- Highlights best match

## User Experience

### For Passengers (Ride Requesters)
1. **On Ride Demand Detail Page**:
   - Click "Find AI Matches" button
   - See top matching rides with detailed scores
   - View why each ride is recommended
   - Direct link to book matched rides

2. **On Carpooling Browse Page**:
   - Switch to "AI Recommendations" tab
   - See personalized ride suggestions
   - Recommendations improve as user completes more rides

### Benefits
- **Time Saving**: Quickly find rides that actually match your route
- **Better Matches**: AI considers multiple factors beyond just location
- **Personalized**: Learns from your travel patterns
- **Transparent**: See exactly why each ride is recommended
- **Confidence**: Compatibility scores help make informed decisions

## Future Enhancements

Potential improvements that could be added:
1. **Machine Learning Model**: Train a model on successful ride matches
2. **Real-time Traffic Integration**: Factor in current traffic conditions
3. **Weather Considerations**: Adjust recommendations based on weather
4. **Social Compatibility**: Match users with similar interests/preferences
5. **Dynamic Pricing Suggestions**: AI-suggested optimal pricing
6. **Route Optimization**: Suggest optimal pickup/dropoff points
7. **Predictive Analytics**: Predict ride demand and availability

## Performance Considerations

- Matching algorithms are optimized for real-time use
- Results are limited to top 10 matches for performance
- User history analysis is cached where possible
- Geospatial queries use MongoDB 2dsphere indexes
- API responses are designed to be fast (<500ms typical)

## Data Privacy

- All matching is done server-side
- User history is only used for recommendations
- No personal data is shared between users
- Ratings are aggregated for compatibility scoring




