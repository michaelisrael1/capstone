# Team 5 - Capstone - Madonna Alliance

## Overview

This project is a custom administrative platform built for Madonna to replace and streamline several manual spreadsheet-based workflows. The system is designed to consolidate data from multiple Excel sheets into a unified database-backed application, making it easier for staff to manage participant records, program enrollment, staff assignments, Special Olympics involvement, and communication preferences.

The platform is intended to reduce duplicate data entry, improve record accuracy, and support automated data uploads from structured spreadsheets into a central dashboard.

## Purpose

Madonna currently manages important operational data across multiple spreadsheets. This project brings that information into a single system where staff can:

* View and manage participant profiles

* Track program enrollment across multiple programs

* Record staff and DSP assignments

* Track Special Olympics participation

* Manage contact and notification preferences

* Import spreadsheet data in a structured, repeatable way

## Key Features

Unified record management for participant and staff-facing administrative data

Multi-program enrollment tracking, including support for primary and secondary programs

Enrollment status management (such as active, shadow, and other statuses)

Staff assignment fields for DSPs, coordinators, and related roles

Special Olympics tracking, including supported sports and filtering options

Notification preferences, allowing users to control which types of alerts they receive

Spreadsheet-to-platform upload workflow using a Python-based import tool

Use of existing program abbreviations and internal data conventions to maintain compatibility with current workflows

## Data Workflow

The platform is built around a structured import process:

* Madonna staff prepare and maintain a standardized Excel template

* Required fields are validated and formatted for upload

* A Python-based extraction/import utility processes the spreadsheet data

* The cleaned data is uploaded into the application dashboard

* Staff can then manage and review records through the web interface

This workflow helps preserve Madonna’s current spreadsheet processes while improving automation and reducing manual entry.

## Technical Direction

The application is being designed as a web-based administrative tool that integrates with Madonna’s broader website ecosystem. A major part of the project includes determining the best approach for:

* Secure database hosting

* Website/application integration

* HIPAA-conscious infrastructure planning

* Compatibility with Madonna’s current technical environment

Because the platform handles sensitive administrative data, hosting and compliance considerations are an important part of the implementation.

## Current Focus

The current phase of the project is focused on:

* Finalizing the spreadsheet schema used for automated uploads

* Expanding profile fields to include program, sports, staffing, and communication data

* Building application support for multiple program enrollments

* Implementing configurable notification settings

* Evaluating secure hosting and deployment options

## Goal

The goal of this project is to give Madonna a more scalable, reliable, and maintainable way to manage administrative records by transforming spreadsheet-heavy workflows into a centralized application that supports automation, visibility, and future growth.
