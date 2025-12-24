import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ZonePlanFormDialog } from './zone-plan-form-dialog';

describe('ZonePlanFormDialog', () => {
  let component: ZonePlanFormDialog;
  let fixture: ComponentFixture<ZonePlanFormDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZonePlanFormDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ZonePlanFormDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
