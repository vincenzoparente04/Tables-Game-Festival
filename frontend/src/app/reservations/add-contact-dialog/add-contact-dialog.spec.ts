import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddContactDialog } from './add-contact-dialog';

describe('AddContactDialog', () => {
  let component: AddContactDialog;
  let fixture: ComponentFixture<AddContactDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddContactDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddContactDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
