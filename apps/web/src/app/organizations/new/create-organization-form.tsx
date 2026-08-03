"use client";

import { useActionState } from "react";

import {
  createOrganizationAction,
  type CreateOrganizationFormState,
} from "./actions";

const initialState: CreateOrganizationFormState = {};

export function CreateOrganizationForm(): React.JSX.Element {
  const [state, formAction, isPending] = useActionState(createOrganizationAction, initialState);

  return (
    <form action={formAction} className="form-panel">
      <div className="form-grid">
        <label className="form-field">
          <span className="form-label">Organization name</span>
          <input className="form-input" name="name" required placeholder="Processing Group" />
        </label>

        <label className="form-field">
          <span className="form-label">Slug</span>
          <input
            className="form-input"
            name="slug"
            placeholder="processing-group"
            pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
            title="Use lowercase letters, numbers, and hyphens"
          />
        </label>

        <label className="form-field">
          <span className="form-label">Plan</span>
          <select className="form-input" name="plan" defaultValue="starter">
            <option value="starter">Starter</option>
            <option value="team">Team</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </label>

        <label className="form-field">
          <span className="form-label">Data region</span>
          <input className="form-input" name="dataRegion" defaultValue="us-east-1" required />
        </label>

        <label className="form-field form-field-wide">
          <span className="form-label">Owner email</span>
          <input
            className="form-input"
            name="ownerEmail"
            type="email"
            placeholder="owner@example.com"
          />
        </label>
      </div>

      {state.error ? <p className="form-error">{state.error}</p> : null}

      <button className="button-primary" disabled={isPending} type="submit">
        {isPending ? "Creating organization..." : "Create organization"}
      </button>
    </form>
  );
}
