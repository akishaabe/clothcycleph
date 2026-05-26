# New Revised Developed System Process Flow

```mermaid
flowchart TD
  Start([Start]) --> Landing[Open ClothCycle PH web app]
  Landing --> AuthChoice{Visitor has an account?}

  AuthChoice -- No --> Signup[Sign up and accept terms]
  Signup --> EmailCode[Send verification or two-factor code by configured email provider]
  EmailCode --> VerifySignup[Verify code]

  AuthChoice -- Yes --> Login[Log in with email/password or Google]
  Login --> AuthCheck{Additional verification needed?}
  AuthCheck -- Yes --> VerifyLogin[Verify email 2FA or TOTP]
  AuthCheck -- No --> Session[Create JWT session]
  VerifySignup --> Session
  VerifyLogin --> Session
  Session --> Restore[Restore session on refresh or reopened app while token is valid]
  Restore --> RoleGate{Role}

  RoleGate -- User --> UserDashboard[User dashboard]
  RoleGate -- Partner --> PartnerDashboard[Partner dashboard]
  RoleGate -- Admin --> AdminDashboard[Admin dashboard]

  UserDashboard --> Submit[Create textile submission]
  Submit --> Upload[Upload photos to R2 or local upload handler]
  Submit --> Intake[Enter textile details, quantity, weight, pathway intent, and optional burn-test answers]
  Intake --> Validate{Form and API validation pass?}
  Validate -- No --> IntakeErrors[Show errors and keep draft context]
  IntakeErrors --> Intake
  Validate -- Yes --> SaveSubmission[Save submission, details, burn test, images, and upload links]

  SaveSubmission --> DssPage[Open DSS confirmation]
  DssPage --> DssEngine[Evaluate textile recovery rules]
  DssEngine --> Eligibility{Restricted or blocked?}
  Eligibility -- Yes --> Rejection[Show rejection or route-block guidance]
  Rejection --> UserDashboard
  Eligibility -- No --> Recommendations[Show ranked Donate, Recycle, and Upcycle recommendations]
  Recommendations --> RouteContext[Show bag color, route estimate, partner locations, and readable reasoning]
  RouteContext --> SelectPathway[User selects pathway]
  SelectPathway --> SelectPartner[User selects partner]
  SelectPartner --> SendPartnerRequest[Send selected recommendation to partner]

  SendPartnerRequest --> ExistingCheck{Same request already exists?}
  ExistingCheck -- Yes --> ReturnExisting[Return existing partner request without duplicate records]
  ExistingCheck -- No --> SaveDssAudit[Save recommendation run and selected result]
  SaveDssAudit --> CreateTransaction[Create pending transaction request]
  CreateTransaction --> AssignPartner[Assign partner and selected service type to submission]
  AssignPartner --> PartnerRequestNotify[Notify partner of new textile request]
  PartnerRequestNotify --> UserSentNotify[Notify user that request was sent]
  ReturnExisting --> UserSentNotify

  PartnerDashboard --> PartnerRequests[View assigned partner requests]
  PartnerRequests --> PartnerReview[Review user brief, photos, weight, DSS reasoning, bag color, and tracking history]
  PartnerReview --> PartnerDecision{Decision}
  PartnerDecision -- Reject --> RejectRequest[Set request status to rejected]
  PartnerDecision -- Accept --> AcceptRequest[Set request status to accepted]
  RejectRequest --> NotifyRejected[Notify and message user]
  AcceptRequest --> NotifyAccepted[Notify and message user with tracking link]

  NotifyAccepted --> UserTracking[User opens accepted request tracking section]
  UserTracking --> Fulfillment{Fulfillment method}
  Fulfillment -- Courier --> CourierForm[Enter contact name, courier, tracking number, status, and notes]
  Fulfillment -- Direct drop-off --> DropoffForm[Enter contact name, date/time, location, status, and notes]
  CourierForm --> SaveTracking[Save tracking update]
  DropoffForm --> SaveTracking
  SaveTracking --> TrackingTimeline[Show latest update and tracking timeline]
  TrackingTimeline --> PartnerTrackingMessage[Send partner notification and automatic message]
  PartnerTrackingMessage --> PartnerViewsTracking[Partner views delivery/drop-off details]

  AcceptRequest --> OutcomeAvailable[Enable partner outcome report]
  OutcomeAvailable --> CompleteRequest[Partner marks request completed]
  CompleteRequest --> OutcomeReport[Save outcome title, description, and photos]
  OutcomeReport --> OutcomeNotify[Send celebration notification and message to user]
  OutcomeNotify --> UserAnalytics[Update user request history, Textile Wins, analytics, messages, and notifications]
  NotifyRejected --> UserAnalytics
  UserSentNotify --> UserAnalytics

  PartnerDashboard --> RuleChange[Partner submits DSS rule-change request]
  RuleChange --> AdminRuleInbox[Admin receives rule-change notification]
  AdminRuleInbox --> RuleReview{Admin review}
  RuleReview -- Accept/approve/decline --> RuleStatus[Update request status and notify partner]
  RuleReview -- Needs more info --> RuleReply[Admin/partner replies in request thread]
  RuleReply --> RuleStatus

  AdminDashboard --> ManageUsers[Manage users, partner accounts, status, and required partner locations]
  AdminDashboard --> ManageSubmissions[Review submissions and update submission status]
  AdminDashboard --> ManageRules[Create, update, or delete DSS rule records]
  AdminDashboard --> DeletedRecords[View deleted-record archive]
  ManageRules --> DeletedRecords
  ManageUsers --> DeletedRecords

  UserAnalytics --> End([End])
  RuleStatus --> End
```

## Current Status Values Reflected

- User role: `user`, `partner`, `admin`
- User status: `active`, `inactive`, `suspended`
- Partner status: `pending`, `active`, `inactive`, `rejected`
- Submission status: `pending`, `verified`, `processed`, `rejected`
- Partner request status: `pending`, `accepted`, `completed`, `rejected`
- Tracking progress: `request_sent`, `scheduled`, `in_transit`, `dropoff_completed`, `completed`
- Tracking fulfillment method: `drop_off`, `shipping`, `pickup`, `other`
- Rule-change status: `pending`, `accepted`, `approved`, `declined`, `needs_more_information`, `implemented`

## Current Storage Points

- Submissions are stored in `submissions`, `submission_details`, `burn_tests`, and `submission_images`.
- DSS audit is stored in `recommendation_runs` and `recommendation_results`.
- Partner requests are stored in `transactions`.
- User delivery updates are stored in `request_tracking_updates`.
- Partner outcome stories are stored on `transactions`.
- Notifications and automatic conversation messages are stored in `notifications` and `messages`.
