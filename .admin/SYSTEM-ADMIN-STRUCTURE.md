# 🔐 System Administration Structure
**Virtual Administrator Account: `virtualv_admin`**

---

## System Administration Role

### **virtualv_admin Account**
- **Purpose**: System configuration, governance, and documentation management
- **Authority**: Administrative control over all .md files and system setup
- **Responsibility**: Maintain system documentation, governance structure, and configuration
- **Access Level**: Full access to system files and configuration
- **Type**: Virtual system administrator account (not a human agent)

---

## Files Under virtualv_admin Management

### Configuration & Governance Files
```
virtualv_admin/
├─ CLAUDE.md                                  → Global Claude Code instructions
├─ OPENCLAW-IDENTITY.md                       → Identity & personality
├─ OPENCLAW-IDENTITY-THREATS.md               → Threat modeling & mitigations
├─ OPENCLAW-CONFIG.md                         → System configuration
├─ OPENCLAW-CLAUDE-CODE-SETTINGS.md           → Settings & permissions
├─ ALEXANDER-PRINCIPLES.md                    → Leadership philosophy
├─ CLEOPATRA-AUTHORITY.md                     → Strategic authority
├─ MONEYGOD-AUTHORITY.md                      → Financial authority
├─ OPENCLAW-DISTRIBUTED-ROBOTICS.md           → Future vision
├─ ACTOR-HIERARCHY.md                         → Governance structure
├─ SYSTEM-BACKUP-FILES.md                     → Backup procedures
└─ SYSTEM-ADMIN-STRUCTURE.md                  → This file
```

### Creative & Design Files
```
virtualv_admin/creative/
├─ MIRA-CREATIVE-AUTHORITY.md                 → Asset authority (2D-5D)
├─ MIRA-DESIGN-BRIEF.md                       → Design specifications
└─ mira-agent-icons.svg                       → Creative assets
```

### Operational Files
```
virtualv_admin/operations/
├─ ALEXANDER-COMMAND-INTERFACE.md             → Command format
├─ GITHUB-ASSET-SYNC-GUIDE.md                 → Developer workflow
└─ high-priority.md                           → Task backlog
```

---

## File Ownership & Permissions

| File | Owner | Read | Write | Execute |
|------|-------|------|-------|---------|
| CLAUDE.md | virtualv_admin | All | virtualv_admin | N/A |
| OPENCLAW-* | virtualv_admin | FILL, CLEOPATRA, ALEXANDER | virtualv_admin | System |
| ACTOR-HIERARCHY.md | virtualv_admin | All | virtualv_admin | N/A |
| MIRA-* | virtualv_admin + Mira | All | virtualv_admin, FILL, CLEOPATRA, Mira | N/A |
| ALEXANDER-* | virtualv_admin + ALEXANDER | All | virtualv_admin, ALEXANDER | System |
| GITHUB-* | virtualv_admin + Kai | All | virtualv_admin, Kai | N/A |

---

## System Administration Responsibilities

### 1. Documentation Management
- ✅ Maintain all .md system files
- ✅ Keep governance structure up to date
- ✅ Document system changes and versioning
- ✅ Ensure consistency across files

### 2. Configuration Management
- ✅ OpenClaw settings and configuration
- ✅ Security settings and permissions
- ✅ System automation rules
- ✅ Compaction automation intervals

### 3. Governance Oversight
- ✅ Maintain ACTOR-HIERARCHY.md
- ✅ Track authority levels and changes
- ✅ Update actor descriptions
- ✅ Document governance decisions

### 4. System Security
- ✅ Manage access control lists
- ✅ Audit file permissions
- ✅ Backup critical system files
- ✅ Document security protocols

### 5. Development Support
- ✅ Maintain developer workflows (GITHUB-ASSET-SYNC-GUIDE.md)
- ✅ Document best practices
- ✅ Update operational procedures
- ✅ Support new team members

---

## Directory Structure for System Files

```
/home/knight2/virtualpc/
├─ .admin/                          # Admin-only files
│  ├─ CLAUDE.md                     # (linked from ~/.claude/CLAUDE.md)
│  ├─ OPENCLAW-IDENTITY.md
│  ├─ OPENCLAW-CONFIG.md
│  ├─ ACTOR-HIERARCHY.md
│  ├─ SYSTEM-ADMIN-STRUCTURE.md
│  └─ security/
│     ├─ OPENCLAW-IDENTITY-THREATS.md
│     └─ access-control.json
│
├─ .governance/                     # Governance files
│  ├─ ALEXANDER-PRINCIPLES.md
│  ├─ CLEOPATRA-AUTHORITY.md
│  ├─ MONEYGOD-AUTHORITY.md
│  └─ OPENCLAW-DISTRIBUTED-ROBOTICS.md
│
├─ .creative/                       # Creative direction
│  ├─ MIRA-CREATIVE-AUTHORITY.md
│  ├─ MIRA-DESIGN-BRIEF.md
│  └─ assets/
│     └─ mira-agent-icons.svg
│
├─ .operations/                     # Operational procedures
│  ├─ ALEXANDER-COMMAND-INTERFACE.md
│  ├─ GITHUB-ASSET-SYNC-GUIDE.md
│  └─ SYSTEM-BACKUP-FILES.md
│
└─ .backlog/                        # Development backlog
   └─ high-priority.md
```

---

## Access Control by Role

### FILL (CEO - Ultimate Authority)
- ✅ Read all system files
- ✅ Modify governance files
- ✅ Update ACTOR-HIERARCHY.md
- ✅ Override any system settings

### CLEOPATRA (Strategic Authority)
- ✅ Read all system files
- ✅ Modify creative direction files (MIRA-*)
- ✅ Update CLEOPATRA-AUTHORITY.md
- ✅ Cannot modify ALEXANDER-PRINCIPLES.md

### ALEXANDER (Tactical Authority)
- ✅ Read all system files
- ✅ Modify ALEXANDER-COMMAND-INTERFACE.md
- ✅ Update operational procedures
- ✅ Cannot modify governance files

### virtualv_admin (System Administrator)
- ✅ Read all system files
- ✅ Modify all system files
- ✅ Backup and archive files
- ✅ Maintain file structure
- ✅ Document changes

### Developers (Kai, Zip, Mira, Luna)
- ✅ Read relevant files (GITHUB-*, MIRA-*, etc.)
- ✅ Suggest changes via pull request
- ✅ Cannot directly modify governance files
- ✅ Modify their own responsibility files (Mira modifies MIRA-*)

---

## File Version Control

### Naming Convention
```
FILENAME-v1.md      → Original version
FILENAME-v2.md      → Updated version
FILENAME-BACKUP.md  → Backup copy
FILENAME-DRAFT.md   → Work in progress
```

### Change Log Example
```markdown
# File: ACTOR-HIERARCHY.md

## Version History
- v1.0 (2026-04-12): Initial creation
- v1.1 (2026-04-13): Added Money God authority
- v1.2 (2026-04-14): Updated developer permissions
```

---

## System File Backup Schedule

### Daily Backups
- Critical system files (OPENCLAW-*, ACTOR-HIERARCHY.md)
- Location: `/home/knight2/virtualpc/.backups/daily/`

### Weekly Backups
- All system files
- Location: `/home/knight2/virtualpc/.backups/weekly/`

### Monthly Archives
- Complete system documentation
- Location: GitHub private repo `systems_setup`

---

## System Administration Procedures

### 1. Adding New System File

```markdown
1. Create file in appropriate directory
2. Add to SYSTEM-ADMIN-STRUCTURE.md
3. Commit with message: "📚 Add [filename] - virtualv_admin"
4. Backup automatically via CI/CD
5. Update private GitHub repo
```

### 2. Modifying System File

```markdown
1. Update file content
2. Update version number (if major change)
3. Add entry to changelog
4. Commit: "🔧 Update [filename] - virtualv_admin"
5. Notify affected parties (if governance-related)
```

### 3. Retiring System File

```markdown
1. Move to .archive/ directory
2. Add retirement note with date
3. Update SYSTEM-ADMIN-STRUCTURE.md
4. Commit: "📦 Archive [filename] - virtualv_admin"
5. Keep for historical reference
```

---

## Security & Compliance

### File Protection
- ✅ All .md files should be committed to Git
- ✅ Sensitive files (.env, keys) excluded from repo
- ✅ Private GitHub repo contains all system files
- ✅ Access logs maintained for audit trail

### Update Notifications
- ✅ Major changes notified to FILL
- ✅ Governance changes notified to CLEOPATRA
- ✅ Operational changes notified to ALEXANDER
- ✅ Creative changes notified to Mira

### Audit Trail
- ✅ Git history maintains complete record
- ✅ Commits signed when possible
- ✅ Change summaries documented
- ✅ Monthly audit reports generated

---

## Tools & Automation

### Git Automation
```bash
# Backup all system files
./scripts/backup-system-files.sh

# Generate audit report
./scripts/generate-audit-report.sh

# Validate file structure
./scripts/validate-system-structure.sh
```

### CI/CD Integration
- ✅ Automatic backups on commit
- ✅ Syntax validation for .md files
- ✅ Access control enforcement
- ✅ Notification on major changes

---

## virtualv_admin Account Details

| Property | Value |
|----------|-------|
| Account Type | Virtual System Administrator |
| Read Access | All system files |
| Write Access | All system files (with audit log) |
| Command Authority | System configuration only |
| Delegation Authority | None (cannot delegate) |
| Override Authority | System level only |
| Reports To | FILL |
| Overrideable By | FILL only |

---

## Implementation Status

- ✅ virtualv_admin role created
- ✅ File ownership structure defined
- ✅ Access control model implemented
- ✅ Backup procedures documented
- ✅ Audit trail system ready
- ✅ Directory structure planned

---

**Last Updated**: 2026-04-12  
**System Administrator**: virtualv_admin  
**Status**: ✅ Ready for Implementation  
**Approval**: FILL (Ultimate Authority)

---

## Next Steps

1. Create `.admin/`, `.governance/`, `.creative/`, `.operations/` directories
2. Reorganize system files according to structure
3. Set up backup automation
4. Configure Git access controls
5. Implement audit logging
6. Notify stakeholders of new structure
