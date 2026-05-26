# ClothCycle PH System Process Flow

```mermaid
flowchart TD
  Start([Start]) --> AuthChoice{User has an account?}
  AuthChoice -- No --> Signup[Sign up and accept terms]
  AuthChoice -- Yes --> Login[Log in]
  Signup --> AuthSecurity[Email or two-factor verification when required]
  Login --> AuthSecurity
  AuthSecurity --> RoleGate{Account role}

  RoleGate -- User --> UserDashboard[Open user dashboard]
  RoleGate -- Partner --> PartnerDashboard[Open partner dashboard]
  RoleGate -- Admin --> AdminDashboard[Open admin dashboard]

  UserDashboard --> SubmitTextile[Create textile submission]
  SubmitTextile --> Intake[Enter item details, condition, cleanliness, quantity, weight, photos, and optional burn test]
  Intake --> ValidateSubmission{Submission valid?}
  ValidateSubmission -- No --> FormErrors[Show validation errors]
  FormErrors --> Intake
  ValidateSubmission -- Yes --> SaveSubmission[Save submission, details, burn test, and images]

  SaveSubmission --> DssReview[Open recommendation review]
  DssReview --> DssEvaluate[DSS evaluates textile recovery pathways]
  DssEvaluate --> RestrictedCheck{Restricted or blocked for chosen route?}
  RestrictedCheck -- Yes --> RejectedDss[Show rejection guidance]
  RestrictedCheck -- No --> RecommendationCards[Show Donate, Recycle, and Upcycle scores]

  RecommendationCards --> UserSelectsPathway[User chooses final pathway]
  UserSelectsPathway --> PartnerSuggestions[Show suggested partners with route context]
  PartnerSuggestions --> UserSelectsPartner[User selects partner]
  UserSelectsPartner --> SendRequest[Send textile brief to partner]

  SendRequest --> SaveDssAudit[Save recommendation run and selected result]
  SaveDssAudit --> CreateRequest[Create partner request with pending status]
  CreateRequest --> PartnerNotify[Notify partner and create message]
  PartnerNotify --> UserSentNotify[Notify user that request was sent]

  PartnerDashboard --> PartnerRequests[View partner requests]
  PartnerRequests --> PartnerDecision{Partner decision}
  PartnerDecision -- Accept --> RequestAccepted[Set request status to accepted]
  PartnerDecision -- Reject --> RequestRejected[Set request status to rejected]
  RequestAccepted --> NotifyAccepted[Notify user and send message]
  RequestRejected --> NotifyRejected[Notify user and send message]

  NotifyAccepted --> UserTracking[User sees tracking and delivery details section]
  UserTracking --> DeliveryMethod{Fulfillment method}
  DeliveryMethod -- Courier --> CourierDetails[Enter contact name, courier, tracking number, and notes]
  DeliveryMethod -- Direct drop-off --> DropoffDetails[Enter contact name, date/time, location, and notes]
  CourierDetails --> SaveTracking[Save tracking update]
  DropoffDetails --> SaveTracking
  SaveTracking --> TrackingTimeline[Show latest update and tracking history]
  TrackingTimeline --> PartnerTrackingNotify[Notify partner and send automatic message]
  PartnerTrackingNotify --> PartnerViewsTracking[Partner views logistics/drop-off details in request]

  RequestAccepted --> PartnerOutcome[Partner report appears after acceptance]
  PartnerOutcome --> CompleteRequest[Partner marks request as completed and reports outcome]
  CompleteRequest --> OutcomeSaved[Save outcome title, description, and photos]
  OutcomeSaved --> UserCelebration[Notify user with outcome story]
  UserCelebration --> DashboardHistory[Update user dashboard, request history, analytics, messages, and notifications]

  AdminDashboard --> AdminUsers[Manage users and submissions]
  AdminDashboard --> AdminDssRules[Manage DSS rules]
  AdminDashboard --> AdminRuleRequests[Review partner rule-change requests]
  AdminDashboard --> AdminDeleted[View deleted records]
  AdminDssRules --> DssEvaluate
  AdminRuleRequests --> RuleDecision{Admin response}
  RuleDecision -- Accept or decline --> RuleStatusUpdate[Update rule request status]
  RuleDecision -- Needs more info --> RuleReply[Add reply and request clarification]
  RuleStatusUpdate --> PartnerRuleNotify[Notify partner]
  RuleReply --> PartnerRuleNotify

  DashboardHistory --> End([End])
  UserSentNotify --> DashboardHistory
  NotifyRejected --> DashboardHistory
```

## Status Values Reflected In The Flow

- Submission status: `pending`, `verified`, `processed`, `rejected`
- Partner request status: `pending`, `accepted`, `completed`, `rejected`
- Tracking progress: `request_sent`, `scheduled`, `in_transit`, `dropoff_completed`, `completed`
- Rule-change request status: `pending`, `accepted`, `declined`, `needs_more_information`, with schema support also showing `approved` and `implemented`
